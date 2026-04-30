<?php

namespace App\Services;

use App\Models\NutritionPlan;
use App\Models\User;

class NutritionPlanService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new NutritionPlan());
        $this->setRelations(['gym', 'nutritionist', 'members']);
    }

    /**
     * Get all nutrition plans filtered by user access.
     * Respects the X-Gym-Id header to scope results to a single gym when switching context.
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Respect the active gym context sent by the frontend (X-Gym-Id header)
        $activeGymId = request()->header('X-Gym-Id');

        if ($user->role === User::ROLE_OWNER) {
            if ($activeGymId) {
                // Scoped to the selected gym, but still verify ownership
                $query = $query->where('id_gym', $activeGymId)
                               ->whereHas('gym', function ($q) use ($user) {
                                   $q->where('id_owner', $user->id_user);
                               });
            } else {
                // No gym selected: return all plans from all owned gyms
                $query = $query->whereHas('gym', function ($q) use ($user) {
                    $q->where('id_owner', $user->id_user);
                });
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            if ($user->role === User::ROLE_NUTRITIONIST) {
                $query = $query->where('id_nutritionist', $user->id_user);
            }
            
            // Respect active gym context using standardized helper
            $this->applyActiveGymScope($query, $user, 'id_gym');

            // If no active gym was applied, or if we want to fallback to allowed gyms
            // applyActiveGymScope only adds WHERE if active gym is present.
            // If it's NOT present, we might still want to scope to all allowed gyms to avoid seeing EVERYTHING in the db.
            if (!$this->getActiveGymId()) {
                $query = $query->whereIn('id_gym', $user->allowedGymIds());
            }

            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_MEMBER) {
            // Members see only plans they are assigned to
            $query = $query->whereHas('members', function ($q) use ($user) {
                $q->where('users.id_user', $user->id_user);
            });
            if ($activeGymId) {
                $query = $query->where('id_gym', $activeGymId);
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        return $perPage ? $query->paginate($perPage) : collect();
    }

    /**
     * Override create to sync members
     */
    public function create(array $data): \Illuminate\Database\Eloquent\Model
    {
        $idMembers = $data['id_members'] ?? [];
        unset($data['id_members']);

        $plan = $this->model->create($data);

        if (!empty($idMembers)) {
            $plan->members()->sync($idMembers);
        }

        return $plan->fresh($this->relations);
    }

    /**
     * Override update to sync members
     */
    public function update(\Illuminate\Database\Eloquent\Model $plan, array $data): \Illuminate\Database\Eloquent\Model
    {
        if (array_key_exists('id_members', $data)) {
            $idMembers = $data['id_members'] ?? [];
            $plan->members()->sync($idMembers);
            unset($data['id_members']);
        }

        $plan->update($data);

        return $plan->fresh($this->relations);
    }

    /**
     * Get plans by nutritionist ID
     */
    public function getPlansByNutritionistId($nutritionistId)
    {
        return $this->getBy('id_nutritionist', $nutritionistId);
    }

    /**
     * Get plans by member ID
     */
    public function getPlansByMemberId($memberId)
    {
        return $this->getBy('id_member', $memberId);
    }

    /**
     * Get active plans
     */
    public function getActivePlans()
    {
        return $this->query()
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->get();
    }
}
