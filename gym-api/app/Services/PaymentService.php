<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\MembershipPlan;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class PaymentService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Payment());
        $this->setRelations(['user', 'gym', 'course', 'event', 'order.products', 'nutritionPlan']);
    }

    /**
     * Get all payments filtered by user access and active gym
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // 1. Search (Enhanced)
        if ($search = request()->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('id_payment', 'like', "%{$search}%")
                    ->orWhere('external_reference', 'like', "%{$search}%")
                    ->orWhere('id_transaction', 'like', "%{$search}%")
                    ->orWhere('method', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where(function ($nq) use ($search) {
                            $nq->where('name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere(\Illuminate\Support\Facades\DB::raw("CONCAT(name, ' ', last_name)"), 'like', "%{$search}%");
                        });
                    });
            });
        }

        // 2. Filters
        if ($startDate = request()->query('start_date')) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate = request()->query('end_date')) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        if ($status = request()->query('status')) {
            $query->where('status', $status);
        }
        if ($gateway = request()->query('gateway')) {
            $query->where('method', $gateway);
        }

        // 3. Sorting
        $sort = request()->query('sort_by', 'created_at');
        $dir = request()->query('sort_dir', 'desc');
        // Only allow safe columns
        if (in_array($sort, ['created_at', 'amount'])) {
            $query->orderBy($sort, $dir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // Super Admin sees everything
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        // Members only see their own - across all gyms (ignore X-Gym-Id)
        if ($user->role === User::ROLE_MEMBER) {
            $query->where('id_user', $user->id_user);
            return $perPage ? $query->paginate($perPage) : $query->paginate(15);
        }

        // Apply Gym Scope for Owners/Staff using X-Gym-Id or manual gym_id
        $this->applyActiveGymScope($query, $user);

        // For Owners/Staff, restrict by gym if no active gym is specified
        if (!$this->getActiveGymId()) {
            $query->whereIn('id_gym', $user->allowedGymIds());
        }

        return $perPage ? $query->paginate($perPage) : $query->paginate(15);
    }

    /**
     * Get payments by user ID
     */
    public function getPaymentsByUserId($userId)
    {
        return $this->getBy('id_user', $userId);
    }

    /**
     * Get financial summary (metrics) scoped to gym
     */
    public function getFinancialSummary($user)
    {
        $query = $this->query();
        $this->applyActiveGymScope($query, $user);

        return [
            'total_volume' => (clone $query)->count(),
            'todays_intake' => (clone $query)->whereDate('created_at', now()->toDateString())->sum('amount'),
            'total_revenue' => (clone $query)->sum('amount'),
            'currency' => 'TND'
        ];
    }

    /**
     * Create a new payment with strict business rules
     */
    public function createPayment(array $data)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($data) {
            $orderId = null;

            if (!empty($data['category']) && $data['category'] === 'product' && !empty($data['id_product'])) {
                $quantity = max(1, (int) ($data['quantity'] ?? 1));
                $productPrice = (float) $data['amount'];
                $unitPrice = round($productPrice / $quantity, 2);

                $product = \App\Models\Product::query()
                    ->where('id_product', $data['id_product'])
                    ->lockForUpdate()
                    ->first();

                if (!$product) {
                    throw ValidationException::withMessages([
                        'id_product' => ['Selected product was not found.']
                    ]);
                }

                if ($product->stock < $quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => ["Insufficient stock. Only {$product->stock} units available."]
                    ]);
                }

                // Create an Order
                $order = \App\Models\Order::create([
                    'order_date' => now(),
                    'status' => \App\Models\Order::STATUS_COMPLETED,
                    'total_amount' => $productPrice,
                    'id_member' => $data['member_id'],
                ]);

                // Attach Product to Order
                $order->products()->attach($data['id_product'], [
                    'quantity' => $quantity,
                    'price' => $unitPrice
                ]);

                $orderId = $order->id_order;
            }

            // Map strict contract to DB schema and inject system fields
            $mappedData = [
                'amount' => $data['amount'], // Store as decimal units (TND) directly since column is decimal(8,2)
                'id_user' => $data['member_id'] ?? null,
                'id_gym' => $data['id_gym'],
                'type' => $data['category'],
                'method' => $data['gateway'],
                'id_transaction' => $data['external_reference'] ?? 'TXN-' . strtoupper(bin2hex(random_bytes(4))),
                'external_reference' => $data['external_reference'] ?? null,
                'id_order' => $orderId,
                'id_course' => $data['id_course'] ?? null,
                'id_session' => $data['id_session'] ?? null,
                'id_event' => $data['id_event'] ?? null,
                'id_nutrition' => $data['id_nutrition'] ?? null,


                // System overrides (strict enforcement)
                'status' => \App\Enums\PaymentStatus::Pending,
                'is_locked' => false,
                'created_by' => auth()->id(),
            ];

            // Create the record
            $payment = $this->create($mappedData);

            // Logic: Only stay Pending if it's a product and created by a member (from the platform).
            // If a receptionist/owner records a sale (even product), it's finalized immediately.
            $user = auth()->user();
            $isMemberBuyingProduct = ($data['category'] === 'product' && $user?->role === \App\Models\User::ROLE_MEMBER);

            if (!$isMemberBuyingProduct) {
                return $this->finalizePayment($payment, $user?->id_user, $data);
            }

            return $payment;
        });
    }

    /**
     * Finalize a payment transaction
     */
    public function finalizePayment(Payment $payment, $userId = null, array $context = [])
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($payment, $userId, $context) {
            if ($payment->is_locked) {
                throw new \Exception('Transaction is locked and cannot be modified.');
            }

            $finalizedBy = $userId ?? auth()->id();

            // Update the record
            $payment->update([
                'status' => \App\Enums\PaymentStatus::Finalized,
                'is_locked' => true,
                'finalized_by' => $finalizedBy,
            ]);

            // Product stock handling:
            // Decrement stock only for payments created through PaymentService (created_by set),
            // because member checkout flow already decrements stock at purchase time.
            if (
                $payment->type === \App\Models\Payment::TYPE_PRODUCT
                && !empty($payment->id_order)
                && !empty($payment->created_by)
            ) {
                $order = $payment->order()->with('products')->first();

                if (!$order || $order->products->isEmpty()) {
                    throw new \Exception('Product payment is missing order details.');
                }

                foreach ($order->products as $orderedProduct) {
                    $quantity = max(1, (int) ($orderedProduct->pivot->quantity ?? 1));

                    $product = \App\Models\Product::query()
                        ->where('id_product', $orderedProduct->id_product)
                        ->lockForUpdate()
                        ->first();

                    if (!$product) {
                        throw new \Exception('A product in this order no longer exists.');
                    }

                    if ($product->stock < $quantity) {
                        throw ValidationException::withMessages([
                            'quantity' => ["Insufficient stock for {$product->name}. Only {$product->stock} units available."]
                        ]);
                    }

                    $product->decrement('stock', $quantity);
                }
            }

            // Course payments handling
            if ($payment->type === \App\Models\Payment::TYPE_COURSE) {
                if (!empty($payment->id_session)) {
                    // Auto-create attendance for single session
                    \App\Models\Attendance::updateOrCreate([
                        'id_member' => $payment->id_user,
                        'id_session' => $payment->id_session,
                    ], [
                        'status' => \App\Models\Attendance::STATUS_PENDING,
                    ]);
                } else if (!empty($payment->id_course)) {
                    // Auto-enroll for weekly course subscriptions
                    $enrollmentDate = !empty($context['start_date'])
                        ? \Illuminate\Support\Carbon::parse($context['start_date'])->toDateString()
                        : now()->toDateString();

                    $status = \Illuminate\Support\Carbon::parse($enrollmentDate)->startOfDay()->gt(now()->startOfDay())
                        ? 'pending'
                        : 'active';

                    \App\Models\Enrollment::updateOrCreate([
                        'id_member' => $payment->id_user,
                        'id_course' => $payment->id_course,
                    ], [
                        'id_gym' => $payment->id_gym,
                        'status' => $status,
                        'enrollment_date' => $enrollmentDate,
                    ]);

                    // Also add the member to ALL weekly sessions of this course as 'pending'
                    $sessions = \App\Models\Session::where('id_course', $payment->id_course)
                        ->where('is_weekly', true)
                        ->get();
                    foreach ($sessions as $session) {
                        \App\Models\Attendance::updateOrCreate([
                            'id_member' => $payment->id_user,
                            'id_session' => $session->id_session,
                        ], [
                            'status' => \App\Models\Attendance::STATUS_PENDING,
                        ]);
                    }
                }
            }

            // Auto-enroll for event payments
            if ($payment->type === \App\Models\Payment::TYPE_EVENT && !empty($payment->id_event)) {
                \App\Models\AttendanceEvent::updateOrCreate([
                    'id_member' => $payment->id_user,
                    'id_event' => $payment->id_event,
                ], [
                    'status' => \App\Models\AttendanceEvent::STATUS_UPCOMING,
                ]);
            }

            // Membership payments handling
            if ($payment->type === \App\Models\Payment::TYPE_MEMBERSHIP) {
                $planId = $context['id_plan'] ?? null;
                if (empty($planId)) {
                    throw new \Exception('Membership payment requires a valid plan.');
                }

                $plan = MembershipPlan::query()
                    ->where('id', $planId)
                    ->where('id_gym', $payment->id_gym)
                    ->first();

                if (!$plan) {
                    throw new \Exception('Selected membership plan is invalid for this gym.');
                }

                $enrollmentDate = !empty($context['start_date'])
                    ? Carbon::parse($context['start_date'])->toDateString()
                    : now()->toDateString();

                // If an enrollment already exists for this exact membership period, don't create a duplicate.
                $existingMatchingEnrollment = Enrollment::where('id_member', $payment->id_user)
                    ->where('id_gym', $payment->id_gym)
                    ->whereNull('id_course')
                    ->where('id_plan', $plan->id)
                    ->whereDate('enrollment_date', $enrollmentDate)
                    ->whereIn('status', ['active', 'pending'])
                    ->first();

                if (!$existingMatchingEnrollment) {
                    $this->assertNoMembershipOverlap(
                        $payment->id_user,
                        $payment->id_gym,
                        $enrollmentDate,
                        (int) ($plan->duration_days ?? 30),
                        (string) ($plan->type ?? 'standard')
                    );

                    $status = Carbon::parse($enrollmentDate)->startOfDay()->gt(now()->startOfDay())
                        ? 'pending'
                        : 'active';

                    Enrollment::create([
                        'id_member' => $payment->id_user,
                        'id_gym' => $payment->id_gym,
                        'id_course' => null,
                        'id_plan' => $plan->id,
                        'enrollment_date' => $enrollmentDate,
                        'status' => $status,
                        'type' => $plan->type ?? 'standard',
                    ]);
                }
            }

            return $payment->fresh();
        });
    }

    private function assertNoMembershipOverlap(
        string $memberId,
        string $gymId,
        string $newStartDate,
        int $durationDays,
        string $planType = 'standard'
    ): void {
        $newStart = Carbon::parse($newStartDate)->startOfDay();
        $fallbackDays = $durationDays > 0 ? $durationDays : $this->fallbackDurationDays($planType);
        $newEnd = $newStart->copy()->addDays($fallbackDays)->startOfDay();

        $existingMemberships = Enrollment::where('id_member', $memberId)
            ->where('id_gym', $gymId)
            ->whereNull('id_course')
            ->whereIn('status', ['active', 'pending'])
            ->get();

        foreach ($existingMemberships as $membership) {
            if (!$membership->enrollment_date || !$membership->end_date) {
                continue;
            }

            $existingStart = Carbon::parse($membership->enrollment_date)->startOfDay();
            $existingEnd = Carbon::parse($membership->end_date)->startOfDay();
            $hasOverlap = $newStart->lte($existingEnd) && $newEnd->gte($existingStart);

            if ($hasOverlap) {
                throw ValidationException::withMessages([
                    'start_date' => [
                        "The member already has an active or pending membership between {$existingStart->toDateString()} and {$existingEnd->toDateString()}."
                    ]
                ]);
            }
        }
    }

    private function fallbackDurationDays(string $type): int
    {
        return match (strtolower($type)) {
            'premium' => 90,
            'trial' => 3,
            default => 30,
        };
    }
}
