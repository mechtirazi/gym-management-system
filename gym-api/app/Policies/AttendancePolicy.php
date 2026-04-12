<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Attendance;

class AttendancePolicy
{
    /**
     * Determine if the user can view any attendance records
     */
    public function viewAny(User $user): bool
    {
        // Members, Owners, Trainers, and Receptionists can view attendance lists
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_TRAINER,
            User::ROLE_RECEPTIONIST,
            User::ROLE_MEMBER
        ]);
    }

    /**
     * Determine if the user can view the attendance record
     */
    public function view(User $user, Attendance $attendance): bool
    {
        // Members can only view their own attendance record
        if ($user->role === User::ROLE_MEMBER) {
            return $attendance->id_member === $user->id_user;
        }

        // Trainer can view attendance for their sessions
        if ($user->role === User::ROLE_TRAINER) {
            return $attendance->session->id_trainer === $user->id_user;
        }

        // Owner can view attendance in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $attendance->session->course->gym->id_owner === $user->id_user;
        }

        // Receptionist can view attendance in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $attendance->session->course->id_gym)->exists();
        }

        return false;
    }

    /**
     * Determine if the user can create attendance record
     */
    public function create(User $user): bool
    {
        // Only trainer, owner, and receptionist can create attendance
        return in_array($user->role, [
            User::ROLE_OWNER,
            User::ROLE_TRAINER,
            User::ROLE_RECEPTIONIST
        ]);
    }

    /**
     * Determine if the user can update attendance record
     */
    public function update(User $user, Attendance $attendance): bool
    {
        // Trainer can update attendance for their sessions
        if ($user->role === User::ROLE_TRAINER) {
            return $attendance->session->id_trainer === $user->id_user;
        }

        // Receptionist can update attendance in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $attendance->session->course->id_gym)->exists();
        }

        // Owner can update attendance in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $attendance->session->course->gym->id_owner === $user->id_user;
        }

        return false;
    }

    /**
     * Determine if the user can delete attendance record
     */
    public function delete(User $user, Attendance $attendance): bool
    {
        // Owner can delete attendance in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $attendance->session->course->gym->id_owner === $user->id_user;
        }

        // Receptionist can delete attendance in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $user->assignedGyms()->where('gyms.id_gym', $attendance->session->course->id_gym)->exists();
        }

        return false;
    }
}
