<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Event;

class EventPolicy
{
    /**
     * Determine if the user can view any events
     */
    public function viewAny(User $user): bool
    {
        // Owners, Receptionists, Trainers, Nutritionists, and Members can view events (scoped in access checks)
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_TRAINER,
            User::ROLE_NUTRITIONIST,
            User::ROLE_MEMBER,
        ]);
    }

    /**
     * Determine if the user can view an event
     */
    public function view(User $user, Event $event): bool
    {
        // Owner can view events in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $event->gym->id_owner === $user->id_user;
        }

        // Receptionist, Trainer, Nutritionist can view events in their assigned gyms
        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            return $user->assignedGyms()->where('gyms.id_gym', $event->id_gym)->exists();
        }

        // Member can view events in gyms they belong to (via subscription)
        if ($user->role === User::ROLE_MEMBER) {
            return $user->subscriptions()->where('id_gym', $event->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can create an event
     */
    public function create(User $user): bool
    {
        // Owners and Receptionists can create events
        return in_array($user->role, [User::ROLE_OWNER, User::ROLE_RECEPTIONIST]);
    }

    /**
     * Determine if the user can update an event
     */
    public function update(User $user, Event $event): bool
    {
        // Owner can update events in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $event->gym->id_owner === $user->id_user;
        }

        // Receptionist can update events in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $event->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can delete an event
     */
    public function delete(User $user, Event $event): bool
    {
        return $this->update($user, $event);
    }
}
