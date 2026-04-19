<?php

namespace App\Services;

use App\Models\Session;
use App\Models\User;
use App\Models\Gym;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SessionService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Session());
        $this->setRelations(['course', 'trainer', 'attendances', 'course.gym']);
    }

    /**
     * Get all sessions filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $this->syncSessionStatuses();
        $query = $this->query();

        // Members can see all sessions
        if ($user->role === User::ROLE_MEMBER) {
            return $query->get();
        }

        // Owners only see sessions in their gyms
        if ($user->role === User::ROLE_OWNER) {
            return $query->whereHas('course.gym', function ($q) use ($user) {
                $q->where('id_owner', $user->id_user);
            })->get();
        }

        // Staff (Trainers, Receptionists, Nutritionists)
        if (in_array($user->role, [User::ROLE_TRAINER, User::ROLE_RECEPTIONIST, User::ROLE_NUTRITIONIST])) {
            $this->applyActiveGymScope($query, $user, 'id_gym', function ($q, $gymId) {
                $q->whereHas('course.gym', function ($sq) use ($gymId) {
                    $sq->where('id_gym', $gymId);
                });
            });

            if ($user->role === User::ROLE_TRAINER) {
                $query->where('id_trainer', $user->id_user);
            } else {
                $query->whereHas('course.gym', function ($q) use ($user) {
                    $q->whereIn('gyms.id_gym', $user->allowedGymIds());
                });
            }
            
            return $perPage ? $query->paginate($perPage) : $query->get();
        }

        return collect();
    }

    /**
     * Get sessions by course ID
     */
    public function getSessionsByCourseId(string $courseId)
    {
        return $this->getBy('id_course', $courseId);
    }

    /**
     * Get sessions by trainer ID
     */
    public function getSessionsByTrainerId(string $trainerId)
    {
        $this->syncSessionStatuses();
        return $this->getBy('id_trainer', $trainerId);
    }

    /**
     * Synchronize session statuses based on current system time.
     * Logic: upcoming -> ongoing -> completed (Respects 'cancelled').
     */
    public function syncSessionStatuses()
    {
        $now = Carbon::now();
        $today = $now->toDateString();
        $currentTime = $now->toTimeString();

        // 1. Mark as COMPLETED: If session end time is in the past
        Session::where('status', '!=', Session::STATUS_CANCELLED)
            ->where('status', '!=', Session::STATUS_COMPLETED)
            ->where(function ($q) use ($today, $currentTime) {
                $q->where('date_session', '<', $today)
                    ->orWhere(function ($sq) use ($today, $currentTime) {
                        $sq->where('date_session', $today)
                            ->where('end_time', '<', $currentTime);
                    });
            })
            ->update(['status' => Session::STATUS_COMPLETED]);

        // 2. Mark as UPCOMING: If session is in the future (resetting any that are mistakenly ongoing)
        Session::where('status', '!=', Session::STATUS_CANCELLED)
            ->where('status', '!=', Session::STATUS_UPCOMING)
            ->where(function ($q) use ($today, $currentTime) {
                $q->where('date_session', '>', $today)
                    ->orWhere(function ($sq) use ($today, $currentTime) {
                        $sq->where('date_session', $today)
                            ->where('start_time', '>', $currentTime);
                    });
            })
            ->update(['status' => Session::STATUS_UPCOMING]);

        // 3. Mark as ONGOING: If current time is within [start_time, end_time]
        Session::where('status', Session::STATUS_UPCOMING)
            ->where('date_session', $today)
            ->where('start_time', '<=', $currentTime)
            ->where('end_time', '>=', $currentTime)
            ->update(['status' => Session::STATUS_ONGOING]);
    }
}
