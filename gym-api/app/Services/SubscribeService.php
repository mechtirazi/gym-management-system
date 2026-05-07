<?php

namespace App\Services;

use App\Models\Subscribe;
use App\Models\User;

class SubscribeService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Subscribe());
        $this->setRelations(['gym', 'user']);
    }

    /**
     * Get all subscriptions filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Owners only see subscriptions to their gyms
        if ($user->role === User::ROLE_OWNER) {
            $this->applyActiveGymScope($query, $user, 'id_gym');
            return $query->whereHas('gym', function ($q) use ($user) {
                $q->where('id_owner', $user->id_user);
            })->get();
        }

        // Receptionists see subscriptions in their assigned gyms
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return $query->whereHas('gym', function ($q) use ($user) {
                $q->whereIn('gyms.id_gym', $user->allowedGymIds());
            })->get();
        }

        // Members only see their own subscriptions
        if ($user->role === User::ROLE_MEMBER) {
            return $query->where('id_user', $user->id_user)->get();
        }

        return $query->get();
    }

    /**
     * Get subscriptions by gym ID
     */
    public function getSubscribesByGymId($gymId)
    {
        return $this->getBy('id_gym', $gymId);
    }

    /**
     * Get subscriptions by user ID
     */
    public function getSubscribesByUserId($userId)
    {
        return $this->getBy('id_user', $userId);
    }

    /**
     * Create a new subscription with defaults
     */
    public function create(array $data): \Illuminate\Database\Eloquent\Model
    {
        // Default to current authenticated user if not provided
        if (!isset($data['id_user']) || empty($data['id_user'])) {
            $data['id_user'] = auth()->id();
        }

        // Default to active status
        if (!isset($data['status']) || empty($data['status'])) {
            $data['status'] = Subscribe::STATUS_ACTIVE;
        }

        // Default to current date
        if (!isset($data['subscribe_date']) || empty($data['subscribe_date'])) {
            $data['subscribe_date'] = now()->toDateString();
        }

        return parent::create($data);
    }

    /**
     * Get active subscriptions
     */
    public function getActiveSubscribes()
    {
        return $this->getBy('status', Subscribe::STATUS_ACTIVE);
    }
}
