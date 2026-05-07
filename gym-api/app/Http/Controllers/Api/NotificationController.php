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
     * Store a newly created resource in storage.
     */
    public function store(\Illuminate\Http\Request $request)
    {
        try {
            // Manually resolve the StoreNotificationRequest to trigger validation
            // This is necessary because the method signature must match the base controller
            $storeRequest = app(StoreNotificationRequest::class);
            $validatedData = $storeRequest->validated();

            // Authorization is checked here
            $this->authorize('create', Notification::class);

            // Ensure id_sender is set to the current user
            $validatedData['id_sender'] = auth()->id();

            // Ensure is_read is false by default
            $validatedData['is_read'] = false;

            $data = $this->service->create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Notification sent successfully',
            ], 201);
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: ' . $e->getMessage(),
            ], 403);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('NotificationController store error: ' . $e->getMessage(), [
                'payload' => $request->all(),
                'exception' => $e
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error sending notification: ' . $e->getMessage(),
            ], 500);
        }
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
            if ($admin->id_user == $owner->id_user)
                continue;

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
