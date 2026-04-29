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
        $query = $this->query()->orderBy('created_at', 'desc');

        // Apply Date Filters if present
        if (request()->has('start_date')) {
            $query->whereDate('created_at', '>=', request()->query('start_date'));
        }
        if (request()->has('end_date')) {
            $query->whereDate('created_at', '<=', request()->query('end_date'));
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

        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    /**
     * Get payments by user ID
     */
    public function getPaymentsByUserId($userId)
    {
        return $this->getBy('id_user', $userId);
    }

     /**
      * Get total intake for today scoped to gym
      */
     public function getTodaysTotal($user)
     {
         $query = $this->query();
         $this->applyActiveGymScope($query, $user);
         
         return $query->whereDate('created_at', now()->toDateString())
                      ->sum('amount');
     }
}
