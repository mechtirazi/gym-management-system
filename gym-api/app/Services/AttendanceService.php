<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\User;

class AttendanceService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Attendance());
        $this->setRelations(['member', 'session', 'session.course', 'session.course.gym']);
    }

    /**
     * Get all attendance records filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();


        // Owners only see attendance in their gyms
        if ($user->role === User::ROLE_OWNER) {
            $this->applyActiveGymScope($query, $user, 'id_gym', function ($q, $gymId) {
                $q->whereHas('session.course', function ($sq) use ($gymId) {
                    $sq->where('id_gym', $gymId);
                });
            });

            return $query->whereHas('session.course.gym', function ($q) use ($user) {
                $q->where('id_owner', $user->id_user);
            })->get();
        }

        // Trainers only see attendance for their sessions
        if ($user->role === User::ROLE_TRAINER) {
            return $query->whereHas('session', function ($q) use ($user) {
                $q->where('id_trainer', $user->id_user);
            })->get();
        }

        // Receptionists see attendance in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            $this->applyActiveGymScope($query, $user, 'id_gym', function ($q, $gymId) {
                $q->whereHas('session.course', function ($sq) use ($gymId) {
                    $sq->where('id_gym', $gymId);
                });
            });

            return $query->whereHas('session.course.gym', function ($q) use ($user) {
                $q->whereIn('gyms.id_gym', $user->allowedGymIds());
            })->get();
        }

        // Members only see their own attendance
        if ($user->role === User::ROLE_MEMBER) {
            return $query->where('id_member', $user->id_user)->get();
        }

        return collect();
    }

    /**
     * Get attendances by session ID
     */
    public function getAttendancesBySessionId(string $sessionId)
    {
        return $this->getBy('id_session', $sessionId);
    }

    /**
     * Get attendances by member ID
     */
    public function getAttendancesByMemberId(string $memberId)
    {
        return $this->getBy('id_member', $memberId);
    }
}
