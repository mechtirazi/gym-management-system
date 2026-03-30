<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;

class UserService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new User());
        $this->setRelations([]);
    }

    /**
     * Create a new user
     */
    public function create(array $data): Model
    {
        // Handle file upload if provided
        if (isset($data['profile_picture']) && $data['profile_picture'] instanceof UploadedFile) {
            $path = $data['profile_picture']->store('profile_pictures', 'public');
            $data['profile_picture'] = $path;
        }

        return User::create($data);
    }

    /**
     * Update an existing user
     */
    public function update(Model $user, array $data): Model
    {
        // Handle file upload if provided
        if (isset($data['profile_picture']) && $data['profile_picture'] instanceof UploadedFile) {
            // Delete old profile picture if exists
            if ($user->profile_picture) {
                Storage::disk('public')->delete($user->profile_picture);
            }

            $path = $data['profile_picture']->store('profile_pictures', 'public');
            $data['profile_picture'] = $path;
        }

        $user->update($data);

        return $user;
    }

    /**
     * Delete a user
     */
    public function deleteUser(User $user): bool
    {
        return $user->delete();
    }

    /**
     * Get all users, filtered by the authenticated user's role and gym access, optionally paginated.
     * 
     * @param int|null $perPage
     * @return \Illuminate\Database\Eloquent\Collection|\Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getAll(?int $perPage = null)
    {
        $query = $this->applyRoleFilters($this->query());
        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    /**
     * Get a user by ID, filtered by the authenticated user's role and gym access.
     */
    public function getById($id): ?Model
    {
        return $this->applyRoleFilters($this->query())
            ->where($this->model->getKeyName(), $id)
            ->first();
    }

    /**
     * Apply role-based filters to the query.
     */
    protected function applyRoleFilters($query): Builder
    {
        // Normalize to an Eloquent query builder if a Model instance was passed
        if ($query instanceof Model) {
            $query = $query->newQuery();
        }

        $user = auth()->user();

        // Super Admin sees Owners only
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $query->where('role', User::ROLE_OWNER);
        }

        // Owners and Receptionists only see users within their gym ecosystem
        if (in_array($user->role, [User::ROLE_OWNER, User::ROLE_RECEPTIONIST])) {
            $gymIds = $user->allowedGymIds();

            return $query->where(function ($q) use ($gymIds) {
                // Users who are staff in my gyms
                $q->whereHas('gymStaff', function ($sq) use ($gymIds) {
                    $sq->whereIn('id_gym', $gymIds);
                })
                // OR Users who are enrolled in my gyms
                    ->orWhereHas('enrollments', function ($sq) use ($gymIds) {
                        $sq->whereIn('id_gym', $gymIds);
                    })
                // OR Myself
                    ->orWhere('id_user', auth()->id());
            });
        }

        // Other roles (Staff) can only see members in their same gym
        if (in_array($user->role, [User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            $gymIds = $user->allowedGymIds();

            return $query->where('role', User::ROLE_MEMBER)
                ->whereHas('enrollments', function ($sq) use ($gymIds) {
                    $sq->whereIn('id_gym', $gymIds);
                });
        }

        // Members can only see themselves
        return $query->where('id_user', $user->id_user);
    }
}
