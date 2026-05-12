<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\User;
use App\Models\MembershipPlan;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Enums\PaymentStatus;
use App\Services\NotificationService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService,
        protected UserService $userService
    ) {
    }

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
            'message' => 'Successfully impersonated user: ' . $targetUser->name . ' ' . $targetUser->last_name,
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
        $now = now();
        $basicGymsCount = Gym::where('plan', 'basic')->where('status', 'active')->count();
        $proGymsCount = Gym::where('plan', 'pro')->where('status', 'active')->count();

        // Current Platform MRR: Sum of monthly value of all active gym plans (Predictive)
        $mrr = Gym::where('status', 'active')->get()->sum(function ($gym) {
            $price = $gym->platform_subscription_price > 0
                ? $gym->platform_subscription_price
                : ($gym->plan === 'pro' ? 150 : 50);

            switch ($gym->platform_subscription_type) {
                case 'semester':
                case 'semestrial':
                    return $price / 6;
                case 'yearly':
                case 'year':
                    return $price / 12;
                case 'monthly':
                default:
                    return $price;
            }
        });

        // At Risk Revenue: Gyms expiring within the next 7 days
        $expiringGymsList = Gym::with('owner')
            ->withCount('members')
            ->where('status', 'active')
            ->whereNotNull('subscription_expires_at')
            ->where('subscription_expires_at', '<=', $now->copy()->addDays(7))
            ->orderBy('subscription_expires_at', 'asc')
            ->get();

        $expiringGyms = $expiringGymsList->map(function ($gym) {
            return [
                'id_gym' => $gym->id_gym,
                'name' => $gym->name,
                'id_owner' => $gym->id_owner,
                'owner' => $gym->owner ? ['name' => $gym->owner->name . ' ' . $gym->owner->last_name] : null,
                'expiry_date' => $gym->subscription_expires_at->toIso8601String(),
                'days_remaining' => (int) now()->diffInDays($gym->subscription_expires_at, false), // use false to get negative days if past
                'plan' => $gym->plan,
                'revenue_at_risk' => $gym->platform_subscription_price > 0 ? $gym->platform_subscription_price : ($gym->plan === 'pro' ? 150 : 50),
                'members_count' => $gym->members_count ?? 0,
            ];
        });

        // Calculate At Risk Revenue dynamically based on gym platform_subscription_price (fallback to 50/150 if zero)
        $atRiskRevenue = $expiringGymsList->sum(function ($gym) {
            if ($gym->platform_subscription_price > 0)
                return $gym->platform_subscription_price;
            return $gym->plan === 'pro' ? 150 : 50;
        });

        // Recent Churn: Suspended gyms in the last 30 days
        $churnedRevenue = Gym::where('status', 'suspended')
            ->where('updated_at', '>=', now()->subDays(30))
            ->get()
            ->sum(function ($gym) {
                if ($gym->platform_subscription_price > 0)
                    return $gym->platform_subscription_price;
                return $gym->plan === 'pro' ? 150 : 50;
            });

        // REAL multi-month trend based on Gym activation dates (Predictive Performance)
        $revenueTrend = [];
        $activeGyms = Gym::where('status', 'active')->get();

        for ($i = 5; $i >= 0; $i--) {
            $date = $now->copy()->subMonths($i);
            $endOfMonth = $date->copy()->endOfMonth();

            // Calculate MRR for this specific month in the past
            // Includes all gyms that were already created by then
            $monthlyValue = $activeGyms->filter(function ($gym) use ($endOfMonth) {
                return $gym->created_at <= $endOfMonth;
            })->sum(function ($gym) {
                $price = $gym->platform_subscription_price > 0
                    ? $gym->platform_subscription_price
                    : ($gym->plan === 'pro' ? 150 : 50);

                switch ($gym->platform_subscription_type) {
                    case 'semester':
                    case 'semestrial':
                        return $price / 6;
                    case 'yearly':
                    case 'year':
                        return $price / 12;
                    default:
                        return $price;
                }
            });

            $revenueTrend[] = [
                'month' => $date->format('M'),
                'revenue' => (float) $monthlyValue
            ];
        }

        // Member Tier Distribution (Standard vs Elite) - Based on Platform Global Upgrade
        $totalMembers = User::where('role', User::ROLE_MEMBER)->count();
        $eliteMembersCount = User::where('role', User::ROLE_MEMBER)
            ->where('platform_tier', 'premium')
            ->where(function ($q) {
                $q->whereNull('platform_upgrade_expires_at')
                    ->orWhere('platform_upgrade_expires_at', '>', now());
            })->count();
        $standardMembersCount = max(0, $totalMembers - $eliteMembersCount);

        // Calculate Platform Upgrade Revenue (Elite Protocol MRR)
        // Normalized to monthly value (99.99 / 12 months)
        $platformUpgradeMrr = $eliteMembersCount * (99.99 / 12);

        return response()->json([
            'success' => true,
            'data' => [
                'mrr' => (float) $mrr,
                'platform_upgrade_revenue' => (float) $platformUpgradeMrr,
                'basic_gyms_count' => $basicGymsCount,
                'pro_gyms_count' => $proGymsCount,
                'revenue_trend' => $revenueTrend,
                'at_risk_revenue' => (float) $atRiskRevenue,
                'churned_revenue' => (float) $churnedRevenue,
                'expiring_gyms' => $expiringGyms,
                'member_distribution' => [
                    'standard' => $standardMembersCount,
                    'elite' => $eliteMembersCount
                ]
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
            'status' => 'active',
            'suspension_reason' => null,
        ]);

        // Determine price based on current plan if not already set
        $price = $gym->platform_subscription_price > 0 
            ? $gym->platform_subscription_price 
            : ($gym->plan === 'pro' ? 149.99 : 49.99);

        // Create a Payment record for platform revenue tracking
        Payment::create([
            'id_user' => $gym->id_owner, // The owner is the beneficiary/payer context
            'id_gym' => $gym->id_gym,
            'amount' => $price,
            'method' => 'admin_manual',
            'type' => Payment::TYPE_PLATFORM,
            'status' => PaymentStatus::Finalized,
            'is_locked' => true,
            'created_by' => auth()->id(),
            'finalized_by' => auth()->id(),
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

        /** @var \App\Models\Gym $gym */
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

        /** @var \App\Models\Gym $gym */
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
            'type' => 'nullable|string'
        ]);

        $notification = $this->notificationService->sendBroadcast($validated['text'], null, $validated['type'] ?? 'info');

        return response()->json([
            'success' => true,
            'data' => $notification,
            'message' => 'Broadcast notification created successfully.',
        ], 201);
    }

    /**
     * Send a platform-wide notification visible to all gym owners.
     */
    public function broadcastNotificationToOwners(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string|max:5000',
            'type' => 'nullable|string'
        ]);

        $ownerIds = User::where('role', User::ROLE_OWNER)->pluck('id_user');

        if ($ownerIds->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No owners found to receive this broadcast.'
            ], 404);
        }

        $now = now();
        $notifications = [];
        foreach ($ownerIds as $ownerId) {
            $notifications[] = [
                'id_notification' => \Illuminate\Support\Str::uuid(),
                'id_user' => $ownerId,
                'id_sender' => auth()->id(),
                'title' => 'Platform Alert for Owners',
                'text' => $validated['text'],
                'type' => $validated['type'] ?? 'info',
                'is_read' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        \DB::table('notifications')->insert($notifications);

        return response()->json([
            'success' => true,
            'message' => 'Broadcast sent to ' . count($ownerIds) . ' owners successfully.',
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
            'message' => 'Owner created successfully.',
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
            'message' => 'Owner updated successfully.',
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
            'message' => 'Owner deleted successfully.',
        ], 204);
    }

    /**
     * Permanently delete a gym (super admin only).
     */
    public function deleteGym($id_gym)
    {
        try {
            \Log::info('AdminController::deleteGym started for ID: ' . $id_gym);
            $gym = Gym::where('id_gym', $id_gym)->firstOrFail();

            \DB::beginTransaction();

            // 1. Delete deeply nested or complex relationships first
            // Courses have sessions, which have attendances
            foreach ($gym->courses as $course) {
                foreach ($course->sessions as $session) {
                    $session->attendances()->delete();
                    $session->delete();
                }
                $course->delete();
            }

            // Events have attendance_events
            foreach ($gym->events as $event) {
                $event->attendances()->delete();
                $event->delete();
            }

            // 2. Delete simpler relationships
            $gym->membershipPlans()->delete();
            $gym->staff()->delete();
            $gym->subscriptions()->delete();
            $gym->products()->delete();
            $gym->reviews()->delete();
            $gym->members()->delete(); // enrollments

            // 3. Finally delete the gym
            $gym->delete();

            \DB::commit();
            Cache::forget('super_admin_overview_metrics');

            \Log::info('AdminController::deleteGym success for ID: ' . $id_gym);

            return response()->json([
                'success' => true,
                'message' => 'Gym and all related data deleted permanently.',
            ], 200);

        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('AdminController::deleteGym failed: ' . $e->getMessage(), [
                'id_gym' => $id_gym,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete gym: ' . $e->getMessage(),
            ], 500);
        }
    }
}
