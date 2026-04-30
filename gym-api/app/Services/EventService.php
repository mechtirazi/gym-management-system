<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;

class EventService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Event());
        $this->setRelations(['gym', 'reviews', 'attendances']);
    }

    /**
     * Get all events filtered by user access.
     * Respects the X-Gym-Id header to scope results to a single gym when switching context.
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query()->withCount('attendances');

        // Respect the active gym context sent by the frontend (X-Gym-Id header)
        $activeGymId = request()->header('X-Gym-Id');

        // Owners only see events in their gyms
        if ($user->role === User::ROLE_OWNER) {
            if ($activeGymId) {
                // Scoped to the selected gym, but still verify ownership
                $query = $query->where('id_gym', $activeGymId)
                               ->whereHas('gym', function ($q) use ($user) {
                                   $q->where('id_owner', $user->id_user);
                               });
            } else {
                // No gym selected: return all events from all owned gyms
                $query = $query->whereHas('gym', function ($q) use ($user) {
                    $q->where('id_owner', $user->id_user);
                });
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        // Receptionists, Trainers, Nutritionists see events in assigned gyms
        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            return $query->whereIn('id_gym', $user->allowedGymIds())->get();
        }

        // Members only see events in gyms they are subscribed to
        if ($user->role === User::ROLE_MEMBER) {
            $gymIds = $user->allowedGymIds();
            
            if ($activeGymId) {
                $query = $query->where('id_gym', $activeGymId);
            } else {
                $query = $query->whereIn('id_gym', $gymIds);
            }

            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        return collect();
    }
}
