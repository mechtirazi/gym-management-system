<?php

namespace App\Services;

use App\Models\GymStaff;
use App\Models\User;

class GymStaffService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new GymStaff());
        $this->setRelations(['gym', 'user']);
    }

    /**
     * Get all gym staff filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Owners only see staff in their gyms
        if ($user->role === User::ROLE_OWNER) {
            $this->applyActiveGymScope($query, $user);
            return $query->whereHas('gym', function ($q) use ($user) {
                $q->where('id_owner', $user->id_user);
            })->get();
        }

        // Receptionists see staff in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            $this->applyActiveGymScope($query, $user);
            return $query->whereIn('id_gym', $user->allowedGymIds())->get();
        }

        // Members shouldn't really see staff listings
        if ($user->role === User::ROLE_MEMBER) {
            return collect();
        }

        return $query->get();
    }
}
