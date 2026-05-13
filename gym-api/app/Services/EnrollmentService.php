<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\MembershipPlan;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class EnrollmentService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Enrollment());
        $this->setRelations(['member', 'gym', 'plan']);
    }

    /**
     * Create a new enrollment with overlap prevention
     */
    public function create(array $data): Model
    {
        $this->validateMembershipPeriodConflict($data);

        return parent::create($data);
    }

    /**
     * Update enrollment with overlap prevention when resulting status is active/pending.
     */
    public function update(Model $model, array $data): Model
    {
        $targetCourseId = $data['id_course'] ?? $model->id_course ?? null;
        $nextStatus = strtolower((string) ($data['status'] ?? $model->status));

        if (!$targetCourseId && in_array($nextStatus, ['active', 'pending'], true)) {
            $this->validateMembershipPeriodConflict([
                'id_member' => $data['id_member'] ?? $model->id_member,
                'id_gym' => $data['id_gym'] ?? $model->id_gym,
                'id_plan' => $data['id_plan'] ?? $model->id_plan,
                'type' => $data['type'] ?? $model->type,
                'enrollment_date' => $data['enrollment_date'] ?? $model->enrollment_date,
                'status' => $nextStatus,
            ], $model->id);
        }

        return parent::update($model, $data);
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

    /**
     * Prevent overlapping active/pending memberships in the same gym for the same member.
     */
    private function validateMembershipPeriodConflict(array $data, ?string $excludeEnrollmentId = null): void
    {
        if (!empty($data['id_course'])) {
            return;
        }

        $targetStatus = strtolower((string) ($data['status'] ?? 'active'));
        if (!in_array($targetStatus, ['active', 'pending'], true)) {
            return;
        }

        $newStart = Carbon::parse($data['enrollment_date'])->startOfDay();
        $newEnd = $this->calculateEndDate($newStart, $data['id_plan'] ?? null, $data['type'] ?? null);

        $query = Enrollment::where('id_member', $data['id_member'])
            ->where('id_gym', $data['id_gym'])
            ->whereNull('id_course')
            ->whereIn('status', ['active', 'pending']);

        if ($excludeEnrollmentId) {
            $query->where('id', '!=', $excludeEnrollmentId);
        }

        $existingMemberships = $query->get();

        foreach ($existingMemberships as $membership) {
            if (!$membership->enrollment_date) {
                continue;
            }

            $existingStart = Carbon::parse($membership->enrollment_date)->startOfDay();
            $existingEndDate = $membership->end_date;

            if (!$existingEndDate) {
                continue;
            }

            $existingEnd = Carbon::parse($existingEndDate)->startOfDay();

            $hasOverlap = $newStart->lte($existingEnd) && $newEnd->gte($existingStart);
            if ($hasOverlap) {
                throw ValidationException::withMessages([
                    'enrollment_date' => [
                        "Member already has an active or pending subscription between {$existingStart->toDateString()} and {$existingEnd->toDateString()}."
                    ]
                ]);
            }
        }
    }

    private function calculateEndDate(Carbon $startDate, ?string $planId, ?string $type): Carbon
    {
        $durationDays = null;

        if ($planId) {
            $durationDays = MembershipPlan::query()
                ->where('id', $planId)
                ->value('duration_days');
        }

        if (!$durationDays) {
            $durationDays = match (strtolower((string) $type)) {
                'premium' => 90,
                'trial' => 3,
                default => 30,
            };
        }

        return $startDate->copy()->addDays((int) $durationDays)->startOfDay();
    }
}
