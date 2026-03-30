<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Course;

class CoursePolicy
{
    /**
     * Determine if the user can view any courses
     */
    public function viewAny(User $user): bool
    {
        //  Member, owner, receptionist, trainer can view course lists
        // They will be filtered by the service
        return in_array($user->role, [
            User::ROLE_MEMBER,
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_TRAINER,
        ]);

    }

    /**
     * Determine if the user can view the course
     */
    public function view(User $user, Course $course): bool
    {
        // Super admin can view any course
        if ($user->role === 'super_admin') {
            return true;
        }

        // Receptionist can only view courses in their assigned gyms
        if ($user->role === 'receptionist') {
            return $user->assignedGyms()->where('id_gym', $course->id_gym)->exists();
        }

        // Trainer can only view courses where they teach
        if ($user->role === User::ROLE_TRAINER) {
            return $course->sessions()->where('id_trainer', $user->id_user)->exists();
        }

        // Owner can only view courses in their gyms
        if ($user->role === 'owner') {
            return $course->gym->id_owner === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can create a course
     */
    public function create(User $user): bool
    {
        // Only owner can create courses
        return in_array($user->role, [User::ROLE_MEMBER, User::ROLE_OWNER]);

    }

    /**
     * Determine if the user can update a course
     */
    public function update(User $user, Course $course): bool
    {
        // Super admin can update any course
        if ($user->role === 'super_admin') {
            return true;
        }

        // Receptionist can only update courses in their assigned gyms
        if ($user->role === 'receptionist') {
            return $user->assignedGyms()->where('id_gym', $course->id_gym)->exists();
        }

        // Owner can only update courses in their gyms
        if ($user->role === 'owner') {
            return $course->gym->id_owner === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can delete a course
     */
    public function delete(User $user, Course $course): bool
    {
        // Super admin can delete any course
        if ($user->role === 'super_admin') {
            return true;
        }

        // Receptionist can only delete courses in their assigned gyms
        if ($user->role === 'receptionist') {
            return $user->assignedGyms()->where('id_gym', $course->id_gym)->exists();
        }

        // Owner can only delete courses in their gyms
        if ($user->role === 'owner') {
            return $course->gym->id_owner === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can restore a course
     */
    public function restore(User $user, Course $course): bool
    {
        return $this->delete($user, $course);
    }

    /**
     * Determine if the user can permanently delete a course
     */
    public function forceDelete(User $user, Course $course): bool
    {
        return $this->delete($user, $course);
    }
}
