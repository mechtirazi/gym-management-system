<?php

namespace App\Services;

use App\Models\AttendanceEvent;
use App\Models\User;

class AttendanceEventService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new AttendanceEvent());
        $this->setRelations(['member', 'event', 'event.gym']);
    }

    /**
     * Get attendance events filtered by the requesting user's access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Owner: attendance for events in owned gyms
        if ($user->role === User::ROLE_OWNER) {
            return $query->whereHas('event.gym', function ($q) use ($user) {
                $q->where('id_owner', $user->id_user);
            })->get();
        }

        // Receptionist, Trainer, Nutritionist: attendance for events in assigned gyms
        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            $allowedGyms = $user->allowedGymIds() ?? collect();
            return $query->whereHas('event', function ($q) use ($allowedGyms) {
                $q->whereIn('id_gym', $allowedGyms);
            })->get();
        }

        // Member: only their own attendance records
        if ($user->role === User::ROLE_MEMBER) {
            return $query->where('id_member', $user->id_user)->get();
        }

        // All other roles: none
        return collect();
    }

    /**
     * Get attendance events by event ID
     */
    public function getAttendanceEventsByEventId(string $eventId)
    {
        return $this->getBy('id_event', $eventId);
    }

    /**
     * Get attendance events by member ID
     */
    public function getAttendanceEventsByMemberId(string $memberId)
    {
        return $this->getBy('id_member', $memberId);
    }
}
