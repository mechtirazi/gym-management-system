<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;

class CourseService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Course());
        $this->setRelations(['gym', 'sessions']);
    }

    /**
     * Get all courses filtered by user access.
     * Respects the X-Gym-Id header to scope results to a single gym when switching context.
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Respect the active gym context sent by the frontend (X-Gym-Id header)
        $activeGymId = request()->header('X-Gym-Id');

        if ($user->role === User::ROLE_MEMBER) {
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_OWNER) {
            if ($activeGymId) {
                // Scoped to the selected gym, but still verify ownership
                $query = $query->where('id_gym', $activeGymId)
                               ->whereHas('gym', function ($q) use ($user) {
                                   $q->where('id_owner', $user->id_user);
                               });
            } else {
                // No gym selected: return all courses from all owned gyms
                $query = $query->whereHas('gym', function ($q) use ($user) {
                    $q->where('id_owner', $user->id_user);
                });
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_RECEPTIONIST) {
            $query = $query->whereIn('id_gym', $user->allowedGymIds());
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_TRAINER) {
            $query = $query->whereHas('sessions', function ($sq) use ($user) {
                $sq->where('id_trainer', $user->id_user);
            });
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        return $perPage ? $query->paginate($perPage) : collect();
    }

    /**
     * Get courses by gym ID
     */
    public function getCoursesByGymId(string $gymId)
    {
        return $this->getBy('id_gym', $gymId);
    }
}
