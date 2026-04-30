<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreNotificationRequest;
use App\Http\Requests\UpdateNotificationRequest;
use App\Models\Notification;
use App\Services\NotificationService;

class NotificationController extends BaseApiController
{
    public function __construct(NotificationService $notificationService)
    {
        $this->configureBase(
            $notificationService,
            'notification',
            StoreNotificationRequest::class,
            UpdateNotificationRequest::class
        );
    }

    protected function getModelClass()
    {
        return Notification::class;
    }

    /**
     * Mark a notification as read
     */
    public function markAsRead($id)
    {
        $this->service->markAsRead($id);
        return response()->json(['message' => 'Notification marked as read']);
    }

    /**
     * Mark all notifications as read for current user
     */
    public function markAllAsRead()
    {
        $user = auth()->user();
        $this->service->markAllAsRead($user->id_user);
        return response()->json(['message' => 'All notifications marked as read']);
    }

    /**
     * Send a support message to all super admins
     */
    public function contactSupport(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1000'
        ]);

        $owner = auth()->user();
        $superAdmins = \App\Models\User::where('role', \App\Models\User::ROLE_SUPER_ADMIN)->get();

        foreach ($superAdmins as $admin) {
            \App\Models\Notification::create([
                'title' => 'Support Request from ' . $owner->name,
                'text' => $request->message,
                'type' => 'support_ticket',
                'id_user' => $admin->id_user,
                'id_sender' => $owner->id_user,
                'is_read' => false
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Your priority support request has been dispatched.'
        ]);
    }
}
