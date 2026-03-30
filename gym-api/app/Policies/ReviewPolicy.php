<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Review;

class ReviewPolicy
{
    /**
     * Determine if the user can view any reviews
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER,
            User::ROLE_TRAINER,
            User::ROLE_NUTRITIONIST,
        ]);
    }

    /**
     * Determine if the user can view a review
     */
    public function view(User $user, Review $review): bool
    {
        return true;
    }

    /**
     * Determine if the user can create a review
     */
    public function create(User $user): bool
    {
        return $user->role === User::ROLE_MEMBER;
    }

    /**
     * Determine if the user can update a review
     */
    public function update(User $user, Review $review): bool
    {
        return $review->id_user === $user->id_user;
    }

    /**
     * Determine if the user can delete a review
     */
    public function delete(User $user, Review $review): bool
    {
        // Author can delete
        if ($review->id_user === $user->id_user) {
            return true;
        }

        // Gym Owner can delete reviews related to their gym
        if ($user->role === User::ROLE_OWNER) {
            return $review->event->gym->id_owner === $user->id_user;
        }

        // Receptionist can delete reviews for their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $review->event->id_gym)->exists();
        }

        return false;
    }
}
