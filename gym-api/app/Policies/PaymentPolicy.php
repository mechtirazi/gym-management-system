<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Payment;

class PaymentPolicy
{
    /**
     * Determine if the user can view any payments
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER
        ]);
    }

    /**
     * Determine if the user can view a payment
     */
    public function view(User $user, Payment $payment): bool
    {
        // User can only view their own payment
        if ($payment->id_user === $user->id_user) {
            return true;
        }

        // Owner and receptionist can view all payments (scoping in service)
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST
        ]);
    }

    /**
     * Determine if the user can create a payment
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_MEMBER,
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST
        ]);
    }

    /**
     * Determine if the user can update a payment
     */
    public function update(User $user, Payment $payment): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST
        ]);
    }

    /**
     * Determine if the user can delete a payment
     */
    public function delete(User $user, Payment $payment): bool
    {
        return $user->role === User::ROLE_OWNER;
    }
}
