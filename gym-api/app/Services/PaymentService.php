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
                      $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
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

        // Apply Gym Scope using X-Gym-Id or manual gym_id
        $this->applyActiveGymScope($query, $user);

        // For Owners/Staff, restrict by gym. For Members, we primarily filter by id_user later.
        if (!$this->getActiveGymId()) {
            if ($user->role !== User::ROLE_SUPER_ADMIN && $user->role !== User::ROLE_MEMBER) {
                $query->whereIn('id_gym', $user->allowedGymIds());
            }
        }

        // Members only see their own
        if ($user->role === User::ROLE_MEMBER) {
            $query->where('id_user', $user->id_user);
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
             'amount' => (int)($data['amount'] * 100), // Convert decimal TND to cents for storage
             'id_user' => $data['member_id'] ?? null,
             'id_gym' => $data['id_gym'],
             'type' => $data['category'],
             'method' => $data['gateway'],
             'external_reference' => $data['external_reference'] ?? null,
             'id_order' => $orderId,
             
             // System overrides (strict enforcement)
             'status' => \App\Enums\PaymentStatus::Pending,
             'is_locked' => false,
             'created_by' => auth()->id(),
         ];

         // Create the record
         $payment = $this->create($mappedData);

         // Lifecycle transition (Simulate successful authorization)
         return $this->finalizePayment($payment, auth()->id());
     }

     /**
      * Finalize a payment transaction
      */
     public function finalizePayment(Payment $payment, $userId = null)
     {
         if ($payment->is_locked) {
             throw new \Exception('Transaction is locked and cannot be modified.');
         }

         $payment->update([
             'status' => \App\Enums\PaymentStatus::Finalized,
             'is_locked' => true,
             'finalized_by' => $userId ?? auth()->id()
         ]);

         return $payment;
     }
}
