<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\User;

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
                        $uq->where(function($nq) use ($search) {
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
        $orderId = null;
        if (!empty($data['category']) && $data['category'] === 'product' && !empty($data['id_product'])) {
            // Fetch product price or use the payment amount
            $productPrice = $data['amount'];

            // Create an Order
            $order = \App\Models\Order::create([
                'order_date' => now(),
                'status' => \App\Models\Order::STATUS_COMPLETED,
                'total_amount' => $productPrice,
                'id_member' => $data['member_id'],
            ]);

            // Attach Product to Order
            $order->products()->attach($data['id_product'], [
                'quantity' => 1,
                'price' => $productPrice
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

                $plan = \App\Models\MembershipPlan::query()
                    ->where('id', $planId)
                    ->where('id_gym', $payment->id_gym)
                    ->first();

                if (!$plan) {
                    throw new \Exception('Selected membership plan is invalid for this gym.');
                }

                $enrollmentDate = !empty($context['start_date'])
                    ? \Illuminate\Support\Carbon::parse($context['start_date'])->toDateString()
                    : now()->toDateString();

                // Check for existing active membership overlap
                $activeMembership = \App\Models\Enrollment::where('id_member', $payment->id_user)
                    ->where('id_gym', $payment->id_gym)
                    ->whereNull('id_course')
                    ->where('status', 'active')
                    ->first();

                if ($activeMembership) {
                    $currentEndDate = $activeMembership->end_date;
                    if (\Illuminate\Support\Carbon::parse($enrollmentDate)->lt(\Illuminate\Support\Carbon::parse($currentEndDate))) {
                        throw new \Exception("The member already has an active membership ending on {$currentEndDate}. The new membership must start after that date.");
                    }
                }

                $status = \Illuminate\Support\Carbon::parse($enrollmentDate)->startOfDay()->gt(now()->startOfDay()) 
                    ? 'pending' 
                    : 'active';

                \App\Models\Enrollment::create([
                    'id_member' => $payment->id_user,
                    'id_gym' => $payment->id_gym,
                    'id_course' => null,
                    'id_plan' => $plan->id,
                    'enrollment_date' => $enrollmentDate,
                    'status' => $status,
                    'type' => $plan->type ?? 'standard',
                ]);
            }

            return $payment->fresh();
        });
    }
}
