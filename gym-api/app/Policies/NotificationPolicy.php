<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Notification;

class NotificationPolicy
{
    /**
     * Determine if the user can view any notifications
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, User::VALID_ROLES);
    }

    /**
     * Determine if the user can view a notification
     */
    public function view(User $user, Notification $notification): bool
    {
        // Users can only view their own notifications
        return $notification->id_user === $user->id_user;
    }

    /**
     * Determine if the user can create a notification
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_TRAINER, // Added trainer role
        ]);
    }

    /**
     * Determine if the user can update a notification
     */
    public function update(User $user, Notification $notification): bool
    {
        // Staff can update notifications they sent (or for the user)
        if (in_array($user->role, [User::ROLE_OWNER, User::ROLE_RECEPTIONIST])) {
            return true;
        }

        // Users can mark their own as read
        return $notification->id_user === $user->id_user;
    }

    /**
     * Determine if the user can delete a notification
     */
    public function delete(User $user, Notification $notification): bool
    {
        return $notification->id_user === $user->id_user || in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
        ]);
    }
}
