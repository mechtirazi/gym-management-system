<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\User;

class PaymentService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Payment());
        $this->setRelations(['user']);
    }

    /**
     * Get all payments filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Staff can see all payments (filtered by gym joins if implemented)
        if (in_array($user->role, [User::ROLE_OWNER, User::ROLE_RECEPTIONIST])) {
            return $query->get();
        }

        // Other users only see their own payments
        return $query->where('id_user', $user->id_user)->get();
    }

    /**
     * Get payments by user ID
     */
    public function getPaymentsByUserId($userId)
    {
        return $this->getBy('id_user', $userId);
    }

    /**
     * Get payments by method
     */
    public function getPaymentsByMethod($method)
    {
        return $this->getBy('method', $method);
    }
}
