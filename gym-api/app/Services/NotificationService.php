<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService extends BaseService
{
    public function __construct()
    {
        $this->setModel(new Notification());
        $this->setRelations(['user']);
    }

    /**
     * Get all notifications filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query()
            ->where(function ($query) use ($user) {
                $query->where('id_user', $user->id_user)
                    ->orWhereNull('id_user');
            })
            ->orderByDesc('created_at');

        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    /**
     * Get notifications by user ID
     */
    public function getNotificationsByUserId($userId)
    {
        return $this->query()
            ->where(function ($query) use ($userId) {
                $query->where('id_user', $userId)
                    ->orWhereNull('id_user');
            })
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Get recent notifications
     */
    public function getRecentNotifications($days = 7)
    {
        return $this->query()
            ->where('created_at', '>=', now()->subDays($days))
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function sendBroadcast(string $text): Notification
    {
        return $this->create([
            'text' => $text,
            'id_user' => null,
            'is_read' => false,
        ]);
    }

    public function sendToUser(User $user, string $text): Notification
    {
        return $this->create([
            'text' => $text,
            'id_user' => $user->id_user,
            'is_read' => false,
        ]);
    }
}
