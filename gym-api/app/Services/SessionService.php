<?php

namespace App\Services;

use App\Models\Session;
use App\Models\User;
use App\Models\Gym;

class SessionService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Session());
        $this->setRelations(['course', 'trainer', 'attendances', 'course.gym']);
    }

    /**
     * Get all sessions filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Members can see all sessions
        if ($user->role === User::ROLE_MEMBER) {
            return $query->get();
        }

        // Owners only see sessions in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $query->whereHas('course.gym', function ($q) use ($user) {
                $q->where('id_owner', $user->id_user);
            })->get();
        }

        // Trainers only see their own sessions
        if ($user->role === User::ROLE_TRAINER) {
            return $query->where('id_trainer', $user->id_user)->get();
        }

        // Receptionists see sessions in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $query->whereHas('course.gym', function ($q) use ($user) {
                $q->whereIn('gyms.id_gym', $user->allowedGymIds());
            })->get();
        }

        return collect();
    }

    /**
     * Get sessions by course ID
     */
    public function getSessionsByCourseId(string $courseId)
    {
        return $this->getBy('id_course', $courseId);
    }

    /**
     * Get sessions by trainer ID
     */
    public function getSessionsByTrainerId(string $trainerId)
    {
        return $this->getBy('id_trainer', $trainerId);
    }
}
