<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminController extends Controller
{
    public function __construct(
        protected \App\Services\NotificationService $notificationService,
        protected \App\Services\UserService $userService
    ) {}

    /**
     * Impersonate a specific user (Gym Owner/Member etc.)
     * Super Admin exclusively.
     */
    public function impersonate(Request $request, $id_user)
    {
        // Target user fetching
        $targetUser = User::where('id_user', $id_user)->firstOrFail();

        // Create token (using Passport as suggested by common context in these projects)
        $tokenResult = $targetUser->createToken('AdminImpersonationToken');

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $targetUser,
                'access_token' => $tokenResult->accessToken,
                'token_type' => 'Bearer',
                'is_impersonation' => true,
                'impersonated_by' => $request->user()->only(['id_user', 'name', 'last_name', 'role']),
            ],
            'message' => 'Successfully impersonated user: '.$targetUser->name.' '.$targetUser->last_name,
        ], 200);
    }

    /**
     * Suspend a gym (super admin only).
     */
    public function suspendGym(Request $request, $id_gym)
    {
        $validated = $request->validate([
            'suspension_reason' => 'required|string|max:1000',
        ]);

        $gym = Gym::where('id_gym', $id_gym)->firstOrFail();
        $gym->update([
            'status' => 'suspended',
            'suspension_reason' => $validated['suspension_reason'],
        ]);

        Cache::forget('super_admin_overview_metrics');

        return response()->json([
            'success' => true,
            'data' => $gym->fresh(),
            'message' => 'Gym suspended successfully.',
        ], 200);
    }

    /**
     * Reactivate a suspended gym (super admin only).
     */
    public function activateGym($id_gym)
    {
        $gym = Gym::where('id_gym', $id_gym)->firstOrFail();
        $gym->update([
            'status' => 'active',
            'suspension_reason' => null,
        ]);

        Cache::forget('super_admin_overview_metrics');

        return response()->json([
            'success' => true,
            'data' => $gym->fresh(),
            'message' => 'Gym activated successfully.',
        ], 200);
    }

    /**
     * List gyms for the super admin (includes gym owners).
     */
    public function index()
    {
        // Fetch gyms with their owners to avoid empty names in the table.
        $gyms = Gym::with('owner')
            ->withCount('members') 
            ->get();

        return response()->json(['success' => true, 'data' => $gyms]);
    }

    /**
     * Get aggregate revenue statistics for the super admin.
     */
    public function getRevenueStats()
    {
        $basicGymsCount = Gym::where('plan', 'basic')->where('status', 'active')->count();
        $proGymsCount = Gym::where('plan', 'pro')->where('status', 'active')->count();

        // Current Platform MRR based on plans
        $mrr = ($basicGymsCount * 50) + ($proGymsCount * 150);

        // At Risk Revenue: Gyms expiring within the next 7 days
        $expiringGymsList = Gym::with('owner')
            ->where('status', 'active')
            ->whereNotNull('subscription_expires_at')
            ->whereBetween('subscription_expires_at', [now(), now()->addDays(7)])
            ->orderBy('subscription_expires_at', 'asc')
            ->get();

        $expiringGyms = $expiringGymsList->map(function ($gym) {
            return [
                'id_gym' => $gym->id_gym,
                'name' => $gym->name,
                'owner' => $gym->owner ? ['name' => $gym->owner->name . ' ' . $gym->owner->last_name] : null,
                'expiry_date' => $gym->subscription_expires_at->toIso8601String(),
                'days_remaining' => (int) now()->diffInDays($gym->subscription_expires_at),
                'plan' => $gym->plan
            ];
        });

        $atRiskRevenue = $expiringGymsList->sum(function ($gym) {
            return $gym->plan === 'pro' ? 150 : 50;
        });

        // Recent Churn: Suspended gyms in the last 30 days
        $churnedRevenue = Gym::where('status', 'suspended')
            ->where('updated_at', '>=', now()->subDays(30))
            ->get()
            ->sum(function ($gym) {
                return $gym->plan === 'pro' ? 150 : 50;
            });

        // Multi-month trend based on current MRR (mocking historical data for visual flavor)
        $revenueTrend = [
            ['month' => now()->subMonths(5)->format('M'), 'revenue' => round($mrr * 0.65)],
            ['month' => now()->subMonths(4)->format('M'), 'revenue' => round($mrr * 0.72)],
            ['month' => now()->subMonths(3)->format('M'), 'revenue' => round($mrr * 0.81)],
            ['month' => now()->subMonths(2)->format('M'), 'revenue' => round($mrr * 0.88)],
            ['month' => now()->subMonths(1)->format('M'), 'revenue' => round($mrr * 0.94)],
            ['month' => now()->format('M'), 'revenue' => $mrr],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'mrr' => $mrr,
                'basic_gyms_count' => $basicGymsCount,
                'pro_gyms_count' => $proGymsCount,
                'revenue_trend' => $revenueTrend,
                'at_risk_revenue' => $atRiskRevenue,
                'churned_revenue' => $churnedRevenue,
                'expiring_gyms' => $expiringGyms
            ],
        ], 200);
    }

    /**
     * List all gym owners with their gym counts.
     */
    public function getOwners()
    {
        $owners = User::where('role', User::ROLE_OWNER)
            ->withCount([
                'ownedGyms', 
                'ownedGyms as active_gyms_count' => function ($query) {
                    $query->where('status', 'active');
                }
            ])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $owners
        ], 200);
    }

    /**
     * Get all gyms for a specific owner.
     */
    public function getOwnerGyms($id_owner)
    {
        $gyms = Gym::where('id_owner', $id_owner)
            ->withCount('members')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $gyms
        ], 200);
    }

    /**
     * Renew a gym's subscription by adding 30 days.
     */
    public function renewGymSubscription($id_gym)
    {
        $gym = Gym::where('id_gym', $id_gym)->firstOrFail();
        
        $currentExpiry = $gym->subscription_expires_at;
        $newExpiry = ($currentExpiry && $currentExpiry->isFuture()) 
            ? $currentExpiry->addDays(30) 
            : now()->addDays(30);

        $gym->update([
            'subscription_expires_at' => $newExpiry,
            'last_payment_date' => now(),
        ]);

        Cache::forget('super_admin_overview_metrics');

        return response()->json([
            'success' => true,
            'data' => $gym->fresh(),
            'message' => 'Gym subscription renewed for 30 days. New expiry: ' . $newExpiry->toDateTimeString(),
        ], 200);
    }

    /**
     * Disable (suspend) all gyms for a specific owner.
     */
    public function disableAllOwnerGyms($id_owner)
    {
        $gyms = Gym::where('id_owner', $id_owner)->get();
        
        foreach ($gyms as $gym) {
            $gym->update([
                'status' => 'suspended',
                'suspension_reason' => 'Mass-disabled by Super Admin',
            ]);
        }

        Cache::forget('super_admin_overview_metrics');

        return response()->json([
            'success' => true,
            'message' => 'All gyms for this owner have been disabled.',
            'count' => $gyms->count(),
        ], 200);
    }

    /**
     * Activate all gyms for a specific owner.
     */
    public function activateAllOwnerGyms($id_owner)
    {
        $gyms = Gym::where('id_owner', $id_owner)->get();
        
        foreach ($gyms as $gym) {
            $gym->update([
                'status' => 'active',
                'suspension_reason' => null,
            ]);
        }

        Cache::forget('super_admin_overview_metrics');

        return response()->json([
            'success' => true,
            'message' => 'All gyms for this owner have been activated.',
            'count' => $gyms->count(),
        ], 200);
    }

    /**
     * Send a platform-wide notification visible to all users.
     */
    public function broadcastNotification(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string|max:5000',
        ]);

        $notification = $this->notificationService->sendBroadcast($validated['text']);

        return response()->json([
            'success' => true,
            'data' => $notification,
            'message' => 'Broadcast notification created successfully.',
        ], 201);
    }

    /**
     * Send a notification to a single owner.
     */
    public function notifyOwner(Request $request, $id_owner)
    {
        $validated = $request->validate([
            'text' => 'required|string|max:5000',
        ]);

        $owner = User::where('id_user', $id_owner)
            ->where('role', User::ROLE_OWNER)
            ->firstOrFail();

        $notification = $this->notificationService->sendToUser($owner, $validated['text']);

        return response()->json([
            'success' => true,
            'data' => $notification,
            'message' => 'Owner notification created successfully.',
        ], 201);
    }

    /**
     * Store a newly created owner.
     */
    public function storeOwner(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:20',
        ]);

        $owner = $this->userService->create(array_merge($validated, [
            'role' => User::ROLE_OWNER,
            'creation_date' => now(),
        ]));

        return response()->json([
            'success' => true,
            'data' => $owner,
            'message' => 'Owner provisioned successfully.',
        ], 201);
    }

    /**
     * Update an owner.
     */
    public function updateOwner(Request $request, $id_owner)
    {
        $owner = User::where('id_user', $id_owner)
            ->where('role', User::ROLE_OWNER)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $owner->id_user . ',id_user',
            'phone' => 'nullable|string|max:20',
        ]);

        $owner = $this->userService->update($owner, $validated);

        return response()->json([
            'success' => true,
            'data' => $owner,
            'message' => 'Owner identity synced successfully.',
        ], 200);
    }

    /**
     * Delete an owner.
     */
    public function deleteOwner($id_owner)
    {
        $owner = User::where('id_user', $id_owner)
            ->where('role', User::ROLE_OWNER)
            ->firstOrFail();

        $this->userService->deleteUser($owner);

        return response()->json([
            'success' => true,
            'message' => 'Owner node decohered successfully.',
        ], 204);
    }
}
