<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Subscribe;

class SubscribePolicy
{
    /**
     * Determine if the user can view any subscriptions
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
     * Determine if the user can view a subscription
     */
    public function view(User $user, Subscribe $subscribe): bool
    {
        // Member can only view their own subscriptions
        if ($user->role === User::ROLE_MEMBER) {
            return $subscribe->id_user === $user->id_user;
        }

        // Owner can view subscriptions to their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $subscribe->gym->id_owner === $user->id_user;
        }

        // Receptionist can view subscriptions in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $subscribe->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can create a subscription
     */
    public function create(User $user): bool
    {
        return $user->role === User::ROLE_MEMBER;
    }

    /**
     * Determine if the user can update a subscription
     */
    public function update(User $user, Subscribe $subscribe): bool
    {
        // Member can only update their own subscriptions
        if ($user->role === User::ROLE_MEMBER) {
            return $subscribe->id_user === $user->id_user;
        }

        // Owner can update subscriptions to their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $subscribe->gym->id_owner === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can delete a subscription
     */
    public function delete(User $user, Subscribe $subscribe): bool
    {
        // Member can delete their own subscriptions
        if ($user->role === User::ROLE_MEMBER) {
            return $subscribe->id_user === $user->id_user;
        }

        // Owner can delete subscriptions to their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $subscribe->gym->id_owner === $user->id_user;
        }

        return false;
    }
}
