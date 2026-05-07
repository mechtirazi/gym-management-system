<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\User;

class EnrollmentService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Enrollment());
        $this->setRelations(['member', 'gym', 'plan']);
    }

    /**
     * Create a new enrollment with duplicate prevention
     */
    public function create(array $data): \Illuminate\Database\Eloquent\Model
    {
        // Prevent duplicate ACTIVE or PENDING memberships for the same user in the same gym
        $exists = Enrollment::where('id_member', $data['id_member'])
            ->where('id_gym', $data['id_gym'])
            ->whereIn('status', ['active', 'pending'])
            ->exists();

        if ($exists) {
            throw new \Exception('Member already has an active or pending subscription in this facility.');
        }

        return parent::create($data);
    }

    /**
     * Get enrollments filtered by the requesting user's access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        // Auto-check for expirations whenever list is fetched
        $this->checkExpirations($user);

        $query = $this->query()->orderBy('created_at', 'desc');

        // Apply course filter if requested, otherwise default to showing only plan-based memberships
        if (request()->has('id_course') && request('id_course')) {
            $query->where('id_course', request('id_course'));
        } else {
            $query->whereNotNull('id_plan');
        }

        // Apply status filter if requested
        if (request()->has('status') && request('status') !== 'All') {
            $query->where('status', strtolower(request('status')));
        }

        // Apply search filter if requested
        if (request()->has('search') && request('search')) {
            $search = request('search');
            $query->whereHas('member', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

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


    protected function checkExpirations($user)
    {
        $query = Enrollment::with('plan')
            ->whereIn('status', ['active', 'pending']);

        // Scope to user's gyms if not superadmin
        if ($user->role !== User::ROLE_SUPER_ADMIN) {
            $allowedGymIds = $user->allowedGymIds();
            if ($allowedGymIds) {
                $query->whereIn('id_gym', $allowedGymIds);
            }
        }

        $enrollments = $query->get();
        $today = now()->startOfDay();

        foreach ($enrollments as $enrollment) {
            if (!$enrollment->enrollment_date)
                continue;

            $startDate = \Carbon\Carbon::parse($enrollment->enrollment_date)->startOfDay();
            $endDate = $enrollment->end_date ? \Carbon\Carbon::parse($enrollment->end_date)->startOfDay() : null;

            if ($endDate && $endDate->lt($today)) {
                // Expired
                $enrollment->update(['status' => 'expired']);
            } elseif ($enrollment->status === 'pending' && $startDate->lte($today)) {
                // Activate pending
                $enrollment->update(['status' => 'active']);
            }
        }
    }
}
