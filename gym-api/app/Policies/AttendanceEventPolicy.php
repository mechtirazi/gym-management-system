<?php

namespace App\Policies;

use App\Models\User;
use App\Models\AttendanceEvent;

class AttendanceEventPolicy
{
    /**
     * Determine if the user can view any event attendance records
     */
    public function viewAny(User $user): bool
    {
        // Owners, Receptionists, Trainers, Nutritionists, and Members can view attendance

        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_TRAINER,
            User::ROLE_NUTRITIONIST,
            User::ROLE_MEMBER,
        ]);
    }

    /**
     * Determine if the user can view an event attendance record
     */
    public function view(User $user, AttendanceEvent $attendanceEvent): bool
    {
        // Owner can view attendance for events in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $attendanceEvent->event->gym->id_owner === $user->id_user;
        }

        // Receptionist, Trainer, Nutritionist can view attendance in assigned gyms
        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            return $user->assignedGyms()->where('gyms.id_gym', $attendanceEvent->event->id_gym)->exists();
        }

        // Member can view their own attendance
        if ($user->role === User::ROLE_MEMBER) {
            return $attendanceEvent->id_member === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can create event attendance record
     */
    public function create(User $user): bool
    {
        // Owners, Receptionists, and Members can create attendance
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER,
        ]);
    }

    /**
     * Determine if the user can update event attendance record
     */
    public function update(User $user, AttendanceEvent $attendanceEvent): bool
    {
        // Owner can update attendance in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $attendanceEvent->event->gym->id_owner === $user->id_user;
        }

        // Receptionist can update attendance in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $attendanceEvent->event->id_gym)->exists();
        }

        // Member can update their own attendance
        if ($user->role === User::ROLE_MEMBER) {
            return $attendanceEvent->id_member === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can delete event attendance record
     */
    public function delete(User $user, AttendanceEvent $attendanceEvent): bool
    {
        return $this->update($user, $attendanceEvent);
    }
}
