<?php

namespace App\Http\Controllers\Api;

use App\Models\GymStaff;
use App\Models\User;
use App\Models\Gym;
use App\Models\Notification;
use App\Services\GymStaffService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GymStaffController extends BaseApiController
{
    public function __construct(GymStaffService $gymStaffService)
    {
        $this->configureBase(
            $gymStaffService,
            'gym staff',
            StoreGymStaffRequest::class,
            UpdateGymStaffRequest::class
        );
    }

    /**
     * Unified hired endpoint: Handles both creating new staff and inviting existing users.
     */
    public function store(Request $request)
    {
        $email = $request->input('email');
        $idGym = $request->input('id_gym');
        $role = $request->input('role', 'trainer');

        if (!$idGym) {
            return response()->json(['success' => false, 'message' => 'Gym ID is required'], 400);
        }

        $userId = $request->input('id_user');

        // 1. Check if user exists by email AND we are not forcing a direct link
        $user = null;
        if ($email && !$userId) {
            $user = User::where('email', $email)->first();
        }

        if ($user) {
            // User Exists -> Invitation Flow (Only if they aren't already staff)
            $existing = GymStaff::where('id_gym', $idGym)->where('id_user', $user->id_user)->first();
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'This user is already part of your gym staff.'
                ], 422);
            }

            $gym = Gym::find($idGym);
            $gymName = $gym ? $gym->name : 'a gym';

            // Send Notification with encoded data in "type" or "text"
            // Using a structured type: staff_invitation:{gym_id}:{role}
            Notification::create([
                'id_user' => $user->id_user,
                'title' => 'New Staff Invitation',
                'text' => "You have been invited to join \"{$gymName}\" as a " . ucfirst($role) . ".",
                'type' => "staff_invitation:{$idGym}:{$role}"
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Invitation notification sent to existing user.',
                'invitation' => true
            ], 201);
        }

        // 2. User Does Not Exist -> Direct Link Flow
        if (!$userId) {
             return response()->json(['success' => false, 'message' => 'User not found. Register them first or provide an existing email.'], 404);
        }

        try {
            $staff = GymStaff::create([
                'id_gym' => $idGym,
                'id_user' => $userId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Staff member linked successfully.',
                'data' => $staff
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get pending invitations (from notifications).
     */
    public function getInvitations()
    {
        // Fetch notifications of type staff_invitation
        $invitations = Notification::where('id_user', auth('api')->id())
            ->where('type', 'like', 'staff_invitation:%')
            ->where('is_read', false)
            ->get()
            ->map(function ($notif) {
                $parts = explode(':', $notif->type);
                $gymId = $parts[1] ?? null;
                $role = $parts[2] ?? 'trainer';
                
                $gym = Gym::find($gymId);
                
                return [
                    'id_notification' => $notif->id_notification,
                    'id_gym' => $gymId,
                    'gym_name' => $gym ? $gym->name : 'Unknown Gym',
                    'role' => $role,
                    'text' => $notif->text
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $invitations
        ]);
    }

    /**
     * Accept invitation: Create the actual staff record.
     */
    public function joinGym(Request $request)
    {
        $idGym = $request->input('id_gym');
        $role = $request->input('role', 'trainer');
        $notifId = $request->input('id_notification');
        $userId = auth('api')->id();

        // 1. Create Staff Record
        $staff = GymStaff::firstOrCreate([
            'id_gym' => $idGym,
            'id_user' => $userId
        ]);

        // 2. Update user role if they were just a member
        $user = User::find($userId);
        if ($user && $user->role === 'member') {
            $user->role = $role;
            $user->save();
        }

        // 3. Mark notification as read
        if ($notifId) {
            Notification::where('id_notification', $notifId)->update(['is_read' => true]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Successfully joined the gym staff!',
            'data' => $staff
        ]);
    }

    /**
     * Decline invitation: Just mark as read.
     */
    public function declineInvitation(Request $request)
    {
        $notifId = $request->input('id_notification');
        if ($notifId) {
            Notification::where('id_notification', $notifId)->update(['is_read' => true]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Invitation declined.'
        ]);
    }

    protected function getModelClass()
    {
        return GymStaff::class;
    }
}
