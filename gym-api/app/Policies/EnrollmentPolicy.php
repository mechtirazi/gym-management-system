<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Enrollment;

class EnrollmentPolicy
{
    /**
     * Determine if the user can view any enrollments
     */
    public function viewAny(User $user): bool
    {
        // Owners, Receptionists, and Members can view enrollments (members limited to their own)
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER,
        ]);
    }

    /**
     * Determine if the user can view the enrollment
     */
    public function view(User $user, Enrollment $enrollment): bool
    {
        // Owner can view enrollments in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $enrollment->gym->id_owner === $user->id_user;
        }

        // Receptionist can view enrollments in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $enrollment->id_gym)->exists();
        }

        // Member can view their own enrollments
        if ($user->role === User::ROLE_MEMBER) {
            return $enrollment->id_member === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can create an enrollment
     */
    public function create(User $user): bool
    {
        // Owners and Receptionists can create enrollments
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    /**
     * Determine if the user can update an enrollment
     */
    public function update(User $user, Enrollment $enrollment): bool
    {
        // Owner can update enrollments in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $enrollment->gym->id_owner === $user->id_user;
        }

        // Receptionist can update enrollments in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $enrollment->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can delete an enrollment
     */
    public function delete(User $user, Enrollment $enrollment): bool
    {
        return $this->update($user, $enrollment);
    }
}
