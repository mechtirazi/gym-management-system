<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Product;

class ProductPolicy
{
    /**
     * Determine if the user can view any products
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine if the user can view a product
     */
    public function view(User $user, Product $product): bool
    {
        return true;
    }

    /**
     * Determine if the user can create a product
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    /**
     * Determine if the user can update a product
     */
    public function update(User $user, Product $product): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    /**
     * Determine if the user can delete a product
     */
    public function delete(User $user, Product $product): bool
    {
        return $user->role === User::ROLE_OWNER;
    }
}
