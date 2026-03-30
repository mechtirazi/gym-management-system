<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Order;

class OrderPolicy
{
    /**
     * Determine if the user can view any orders
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER,
        ]);
    }

    /**
     * Determine if the user can view an order
     */
    public function view(User $user, Order $order): bool
    {
        // Member can only view their own orders
        if ($user->role === User::ROLE_MEMBER) {
            return $order->id_member === $user->id_user;
        }

        // Owners and Receptionists can view orders (scoping handled in service)
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    /**
     * Determine if the user can create an order
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER,
        ]);
    }

    /**
     * Determine if the user can update an order
     */
    public function update(User $user, Order $order): bool
    {
        // Member can only update their own pending orders
        if ($user->role === User::ROLE_MEMBER) {
            return $order->id_member === $user->id_user && $order->status === Order::STATUS_PENDING;
        }

        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    /**
     * Determine if the user can delete an order
     */
    public function delete(User $user, Order $order): bool
    {
        // Member can only delete their own pending orders
        if ($user->role === User::ROLE_MEMBER) {
            return $order->id_member === $user->id_user && $order->status === Order::STATUS_PENDING;
        }

        return $user->role === User::ROLE_OWNER;
    }
}
