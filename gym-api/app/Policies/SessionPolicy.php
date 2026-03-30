<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Session;

class SessionPolicy
{
    /**Reviewed
     * Determine if the user can view any sessions
     */
    public function viewAny(User $user): bool
    {
        // Members, Owners, Trainers, and Receptionists can view sessions
        return in_array($user->role, [
            User::ROLE_MEMBER,
            User::ROLE_OWNER,
            User::ROLE_TRAINER,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    /**
     * Determine if the user can view a session
     */
    public function view(User $user, Session $session): bool
    {
        // Members can view any session
        if ($user->role === User::ROLE_MEMBER) {
            return true;
        }

        // Trainer can view their own sessions or sessions they are assigned to
        if ($user->role === User::ROLE_TRAINER) {
            return $session->id_trainer === $user->id_user;
        }

        // Owner can view sessions in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $session->course->gym->id_owner === $user->id_user;
        }

        // Receptionist can view sessions in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $session->course->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can create a session
     */
    public function create(User $user): bool
    {
        // Only owner and receptionist can create sessions
        return in_array($user->role, [User::ROLE_OWNER, User::ROLE_RECEPTIONIST]);
    }

    /**
     * Determine if the user can update a session
     */
    public function update(User $user, Session $session): bool
    {
        // Trainer can update their own sessions (e.g., status)
        if ($user->role === User::ROLE_TRAINER) {
            return $session->id_trainer === $user->id_user;
        }

        // Owner can update sessions in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $session->course->gym->id_owner === $user->id_user;
        }

        // Receptionist can update sessions in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $session->course->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can delete a session
     */
    public function delete(User $user, Session $session): bool
    {
        // Owner can delete sessions in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $session->course->gym->id_owner === $user->id_user;
        }

        // Receptionist can delete sessions in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $session->course->id_gym)->exists();
        }

        return false;
    }
}
