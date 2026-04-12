<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\User;

class EnrollmentService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Enrollment());
        $this->setRelations(['member', 'gym']);
    }

    /**
     * Get enrollments filtered by the requesting user's access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        // Auto-check for expirations whenever list is fetched
        $this->checkExpirations($user);

        $query = $this->query()->orderBy('created_at', 'desc');

        // Super Admin sees all enrollments
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        // Owners only see enrollments in their gyms
        if ($user->role === User::ROLE_OWNER) {
            $this->applyActiveGymScope($query, $user);
            $query = $query->whereHas('gym', function ($q) use ($user) {
                $q->where('id_owner', $user->id_user);
            });
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        // Staff (Receptionists, Trainers, Nutritionists) see enrollments in their assigned gyms
        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            $this->applyActiveGymScope($query, $user);
            $allowedGyms = $user->allowedGymIds() ?? collect();
            $query = $query->whereIn('id_gym', $allowedGyms);
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        // Members only see their own enrollments
        if ($user->role === User::ROLE_MEMBER) {
            $query = $query->where('id_member', $user->id_user);
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        // All other roles receive no enrollments
        return collect();
    }


    /**
     * Automatically mark standard enrollments older than 1 month as expired
     */
    protected function checkExpirations($user)
    {
        $oneMonthAgo = now()->subMonth();

        $query = Enrollment::where('type', 'standard')
            ->where('status', 'active')
            ->where('enrollment_date', '<', $oneMonthAgo);

        // Scope to user's gyms if not superadmin
        if ($user->role !== User::ROLE_SUPER_ADMIN) {
            $allowedGymIds = $user->allowedGymIds();
            if ($allowedGymIds) {
                $query->whereIn('id_gym', $allowedGymIds);
            }
        }

        $query->update(['status' => 'expired']);
    }
}
