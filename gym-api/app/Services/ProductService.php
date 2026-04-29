<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;

class ProductService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Product());
        $this->setRelations(['gym', 'orders']);
    }

    /**
     * Get all products filtered by user access.
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
                // No gym selected: return all products from all owned gyms
                $query = $query->whereHas('gym', function ($q) use ($user) {
                    $q->where('id_owner', $user->id_user);
                });
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            if ($activeGymId) {
                $query = $query->where('id_gym', $activeGymId);
            } else {
                $query = $query->whereIn('id_gym', $user->allowedGymIds());
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        if ($user->role === User::ROLE_MEMBER) {
            if ($activeGymId) {
                $query = $query->where('id_gym', $activeGymId);
            } else {
                $subscribedGymIds = $user->subscriptions()->pluck('id_gym');
                $query = $query->whereIn('id_gym', $subscribedGymIds);
            }
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        return $perPage ? $query->paginate($perPage) : collect();
    }

    /**
     * Get products by category
     */
    public function getProductsByCategory(string $category)
    {
        return $this->getBy('category', $category);
    }

    /**
     * Get low stock products
     */
    public function getLowStockProducts(int $threshold = 10)
    {
        return $this->query()
            ->where('stock', '<', $threshold)
            ->get();
    }
}
