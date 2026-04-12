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

        // Staff (Trainers, Receptionists, Nutritionists)
        if (in_array($user->role, [User::ROLE_TRAINER, User::ROLE_RECEPTIONIST, User::ROLE_NUTRITIONIST])) {
            $this->applyActiveGymScope($query, $user, 'id_gym', function ($q, $gymId) {
                $q->whereHas('course.gym', function ($sq) use ($gymId) {
                    $sq->where('id_gym', $gymId);
                });
            });

            if ($user->role === User::ROLE_TRAINER) {
                $query->where('id_trainer', $user->id_user);
            } else {
                $query->whereHas('course.gym', function ($q) use ($user) {
                    $q->whereIn('gyms.id_gym', $user->allowedGymIds());
                });
            }
            
            return $perPage ? $query->paginate($perPage) : $query->get();
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
