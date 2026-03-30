<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

abstract class BaseService
{
    /**
     * The model instance
     */
    protected $model;

    /**
     * Relations to eager load
     */
    protected $relations = [];

    /**
     * Set the model for this service
     */
    public function setModel(Model $model): void
    {
        $this->model = $model;
    }

    /**
     * Set relations to eager load
     */
    public function setRelations(array $relations): void
    {
        $this->relations = $relations;
    }

    /**
     * Get the model query builder with relations
     */
    protected function query()
    {
        $query = $this->model;

        if (!empty($this->relations)) {
            $query = $query->with($this->relations);
        }

        return $query;
    }

    /**
     * Get all records, optionally paginated
     * 
     * @param int|null $perPage
     * @return Collection|LengthAwarePaginator
     */
    public function getAll(?int $perPage = null)
    {
        $query = $this->query();
        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    /**
     * Get all records filtered by user access (scoped), optionally paginated
     * Fallback to getAll() if not overridden in child service
     * 
     * @param mixed $user
     * @param int|null $perPage
     * @return Collection|LengthAwarePaginator
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        return $this->getAll($perPage);
    }

    /**
     * Get a record by ID
     */
    public function getById($id): ?Model
    {
        return $this->query()->find($id);
    }

    /**
     * Create a new record
     */
    public function create(array $data): Model
    {
        return $this->model->create($data);
    }

    /**
     * Update a record
     */
    public function update(Model $model, array $data): Model
    {
        $model->update($data);

        return $model->fresh($this->relations);
    }

    /**
     * Delete a record
     */
    public function delete(Model $model): bool
    {
        return $model->delete();
    }

    /**
     * Find or fail
     */
    public function findOrFail($id): Model
    {
        return $this->query()->findOrFail($id);
    }

    /**
     * Get records by column
     */
    public function getBy(string $column, $value): Collection
    {
        return $this->query()->where($column, $value)->get();
    }

    /**
     * Get first record by column
     */
    public function getFirstBy(string $column, $value): ?Model
    {
        return $this->query()->where($column, $value)->first();
    }

    /**
     * Check if record exists
     */
    public function exists(string $column, $value): bool
    {
        return $this->model->where($column, $value)->exists();
    }

    /**
     * Count records
     */
    public function count(): int
    {
        return $this->model->count();
    }

    /**
     * Count records by column
     */
    public function countBy(string $column, $value): int
    {
        return $this->model->where($column, $value)->count();
    }

    /**
     * Get active gym ID from request header
     */
    protected function getActiveGymId()
    {
        return request()->header('X-Gym-Id');
    }

    /**
     * Apply active gym scope to query if user has access to it
     */
    protected function applyActiveGymScope($query, $user, $column = 'id_gym', $callback = null)
    {
        $activeGymId = $this->getActiveGymId();
        
        \Log::info('applyActiveGymScope: ActiveGymId=' . ($activeGymId ?? 'NULL'));

        // If an active gym is requested and the user has access to it
        if ($activeGymId) {
            $allowedGyms = ($user?->allowedGymIds()?->toArray() ?? []);
            \Log::info('applyActiveGymScope: AllowedGyms=' . implode(',', $allowedGyms));

            if (in_array((string)$activeGymId, array_map('strval', $allowedGyms))) {
                \Log::info('applyActiveGymScope: Scope applied for gym ' . $activeGymId);
                if ($callback && is_callable($callback)) {
                    $callback($query, $activeGymId);
                } else {
                    $query->where($column, $activeGymId);
                }
            } else {
                \Log::info('applyActiveGymScope: Access denied for gym ' . $activeGymId);
            }
        }
        
        return $query;
    }
}
