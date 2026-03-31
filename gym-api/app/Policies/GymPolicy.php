<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Gym;

class GymPolicy
{
    /**Reviewed
     * Determine if the user can view any gyms
     */
    public function viewAny(User $user): bool
    {
        // Members, Owners, Trainers, and Receptionists can view gyms
        return in_array($user->role, [
            User::ROLE_MEMBER,
            User::ROLE_OWNER,
            User::ROLE_TRAINER,
            User::ROLE_RECEPTIONIST
        ]);
    }

    /**
     * Determine if the user can view the gym
     */
    public function view(User $user, Gym $gym): bool
    {
        // Members can view any gym
        if ($user->role === User::ROLE_MEMBER) {
            return true;
        }

        // Owner can only view their own gym
        if ($user->role === User::ROLE_OWNER) {
            return $gym->id_owner === $user->id_user;
        }

        // Trainer or Receptionist can view gyms they are associated with
        if (in_array($user->role, [User::ROLE_TRAINER, User::ROLE_RECEPTIONIST])) {
            return $user->assignedGyms()->where('gyms.id_gym', $gym->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can create a gym
     */
    public function create(User $user): bool
    {
        // Users with MEMBER or OWNER role can create gyms (matching course logic)
        return in_array($user->role, [User::ROLE_SUPER_ADMIN, User::ROLE_OWNER]);
    }

    /**
     * Determine if the user can update a gym
     */
    public function update(User $user, Gym $gym): bool
    {
        // Owner can only update their own gym
        if ($user->role === User::ROLE_OWNER) {
            return $gym->id_owner === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can delete a gym
     */
    public function delete(User $user, Gym $gym): bool
    {
        // Owner can only delete their own gym
        if ($user->role === User::ROLE_OWNER) {
            return $gym->id_owner === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can restore a gym
     */
}
