<?php

namespace App\Services;

use App\Models\Gym;
use App\Models\User;

class GymService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Gym());
        $this->setRelations(['owner', 'courses', 'events', 'subscriptions']);
    }

    /**
     * Get all gyms filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Members can see all gyms
        if ($user->role === User::ROLE_MEMBER) {
            return $query->get();
        }

        // Owners only see their own gyms
        if ($user->role === User::ROLE_OWNER) {
            return $query->where('id_owner', $user->id_user)->get();
        }

        // Staff see gyms they are assigned to (gym_staff)
        if (in_array($user->role, [User::ROLE_TRAINER, User::ROLE_RECEPTIONIST, User::ROLE_NUTRITIONIST])) {
            return $query->whereIn('id_gym', $user->allowedGymIds())->get();
        }

        return collect();
    }
}
