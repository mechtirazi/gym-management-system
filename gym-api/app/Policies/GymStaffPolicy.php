<?php

namespace App\Policies;

use App\Models\User;
use App\Models\GymStaff;

class GymStaffPolicy
{
    /**
     * Determine if the user can view any gym staff
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    /**
     * Determine if the user can view the gym staff
     */
    public function view(User $user, GymStaff $gymStaff): bool
    {
        if ($user->role === User::ROLE_OWNER) {
            return $gymStaff->gym->id_owner === $user->id_user;
        }

        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $gymStaff->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can create a gym staff assignment
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
        ]);
    }

    /**
     * Determine if the user can update a gym staff assignment
     */
    public function update(User $user, GymStaff $gymStaff): bool
    {
        if ($user->role === User::ROLE_OWNER) {
            return $gymStaff->gym->id_owner === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can delete a gym staff assignment
     */
    public function delete(User $user, GymStaff $gymStaff): bool
    {
        return $this->update($user, $gymStaff);
    }
}
