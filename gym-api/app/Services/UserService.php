<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use App\Models\Enrollment;
use App\Models\GymStaff;
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

        $newUser = User::create($data);

        // Auto-assign to gym if created by an owner or receptionist
        $creator = auth()->user();
        if ($creator && in_array($creator->role, [User::ROLE_OWNER, User::ROLE_RECEPTIONIST])) {
            $gymIds = [];

            if (isset($data['id_gym'])) {
                $gymIds[] = $data['id_gym'];
            } elseif (isset($data['gym_id'])) {
                $gymIds[] = $data['gym_id'];
            } elseif (isset($data['gyms']) && is_array($data['gyms'])) {
                foreach ($data['gyms'] as $gym) {
                    if (is_array($gym) && isset($gym['id_gym'])) {
                        $gymIds[] = $gym['id_gym'];
                    } elseif (is_numeric($gym) || is_string($gym)) {
                        $gymIds[] = $gym;
                    }
                }
            }

            // Default to creator's first allowed gym if none provided
            if (empty($gymIds)) {
                $allowed = $creator->allowedGymIds();
                if ($allowed && $allowed->count() > 0) {
                    $gymIds[] = $allowed->first();
                }
            }

            if (!empty($gymIds)) {
                $gymId = $gymIds[0];

                if (in_array($newUser->role, [User::ROLE_TRAINER, User::ROLE_NUTRITIONIST, User::ROLE_RECEPTIONIST])) {
                    \App\Models\GymStaff::create([
                        'id_user' => $newUser->id_user,
                        'id_gym' => $gymId,
                    ]);
                }
            }
        }

        return $newUser;
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

        // Trainers only see members tied to their own course enrollments.
        if ($user->role === User::ROLE_TRAINER) {
            $activeGymId = $this->getActiveGymId();

            $query->with([
                'enrollments' => function ($enrQuery) use ($user, $activeGymId) {
                    $enrQuery->whereHas('course.sessions', function ($sessionQuery) use ($user) {
                        $sessionQuery->where('id_trainer', $user->id_user);
                    })->with(['latestCoursePayment', 'course']);

                    if ($activeGymId) {
                        $enrQuery->where('id_gym', $activeGymId);
                    }
                }
            ]);

            $query = $query->where('role', User::ROLE_MEMBER)
                ->whereHas('enrolledCourses', function ($sq) use ($user) {
                    $sq->whereHas('sessions', function ($sessionQuery) use ($user) {
                        $sessionQuery->where('id_trainer', $user->id_user);
                    });
                });

            $this->applyActiveGymScope($query, $user, 'id_gym', function ($q, $gymId) use ($user) {
                $q->whereHas('enrolledCourses', function ($sq) use ($user, $gymId) {
                    $sq->where('courses.id_gym', $gymId)
                        ->whereHas('sessions', function ($sessionQuery) use ($user) {
                            $sessionQuery->where('id_trainer', $user->id_user);
                        });
                });
            });

            return $query->distinct();
        }

        // Nutritionists can only see members in their same gym
        if ($user->role === User::ROLE_NUTRITIONIST) {
            $query = $query->where('role', User::ROLE_MEMBER);

            // Respect active gym context using standardized helper
            $this->applyActiveGymScope($query, $user, 'id_gym', function ($q, $gymId) {
                $q->whereHas('enrollments', function ($sq) use ($gymId) {
                    $sq->where('id_gym', $gymId);
                });
            });

            // If no active gym context is provided, fallback to all allowed gyms
            if (!$this->getActiveGymId()) {
                $gymIds = $user->allowedGymIds();
                $query->whereHas('enrollments', function ($sq) use ($gymIds) {
                    $sq->whereIn('id_gym', $gymIds);
                });
            }

            return $query;
        }

        // Members can only see themselves
        return $query->where('id_user', $user->id_user);
    }
}
