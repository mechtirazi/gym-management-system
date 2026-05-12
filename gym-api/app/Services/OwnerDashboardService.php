<?php

namespace App\Services;

use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Session;
use App\Models\Subscribe;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Event;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class OwnerDashboardService
{
    private function normalizeRevenueCategory(string $type): string
    {
        $value = strtolower(trim($type));

        if (str_contains($value, 'platform')) {
            return 'Platform';
        }
        if (str_contains($value, 'membership') || str_contains($value, 'enroll') || str_contains($value, 'subscription')) {
            return 'Membership';
        }
        if (str_contains($value, 'course')) {
            return 'Course';
        }
        if (str_contains($value, 'event')) {
            return 'Event';
        }
        if (str_contains($value, 'product') || str_contains($value, 'order')) {
            return 'Product';
        }
        if (str_contains($value, 'nutrition')) {
            return 'Nutrition';
        }

        return ucfirst(str_replace(['_', '-'], ' ', $value ?: 'other'));
    }

    private function calculateTrend($current, $previous): int
    {
        if ((float) $previous == 0.0) {
            return $current > 0 ? 100 : 0;
        }
        return (int) round((($current - $previous) / $previous) * 100);
    }

    private function getRevenueStats(array $gymIdsArray, Carbon $now, Carbon $prevMonthStart, Carbon $prevMonthEnd): array
    {
        $currRevenue = Payment::whereIn('id_gym', $gymIdsArray)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        $prevRevenue = Payment::whereIn('id_gym', $gymIdsArray)
            ->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])
            ->sum('amount');

        return [
            'totalRevenue' => (float) $currRevenue,
            'revenueTrend' => $this->calculateTrend($currRevenue, $prevRevenue)
        ];
    }

    private function getMemberStatsData(array $gymIdsArray, Carbon $currMonthStart): array
    {
        $currActiveMembers = Enrollment::join('users', 'enrollments.id_member', '=', 'users.id_user')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->where('enrollments.status', 'active')
            ->where('users.role', User::ROLE_MEMBER)
            ->distinct('enrollments.id_member')
            ->count('enrollments.id_member');

        $prevActiveMembers = Enrollment::join('users', 'enrollments.id_member', '=', 'users.id_user')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->where('enrollments.status', 'active')
            ->where('users.role', User::ROLE_MEMBER)
            ->where('enrollments.created_at', '<', $currMonthStart)
            ->distinct('enrollments.id_member')
            ->count('enrollments.id_member');

        $pendingMembers = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->where('status', 'pending')
            ->count();

        $expiredMembers = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->where('status', 'expired')
            ->count();

        return [
            'activeMembers' => $currActiveMembers,
            'membersTrend' => $this->calculateTrend($currActiveMembers, $prevActiveMembers),
            'pendingMemberships' => $pendingMembers,
            'expiredMemberships' => $expiredMembers
        ];
    }

    private function getMembershipsStats(array $gymIdsArray, Carbon $currMonthStart, Carbon $prevMonthStart, Carbon $prevMonthEnd): array
    {
        $currNewMem = Enrollment::join('users', 'enrollments.id_member', '=', 'users.id_user')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->where('enrollments.created_at', '>=', $currMonthStart)
            ->where('users.role', User::ROLE_MEMBER)
            ->count();

        $prevNewMem = Enrollment::join('users', 'enrollments.id_member', '=', 'users.id_user')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->whereBetween('enrollments.created_at', [$prevMonthStart, $prevMonthEnd])
            ->where('users.role', User::ROLE_MEMBER)
            ->count();

        return [
            'newMemberships' => $currNewMem,
            'membershipsTrend' => $this->calculateTrend($currNewMem, $prevNewMem)
        ];
    }

    private function getTrainerStats(array $gymIdsArray, Carbon $currMonthStart): array
    {
        $currTrainers = User::where('role', User::ROLE_TRAINER)->whereHas('gymStaff', function ($q) use ($gymIdsArray) {
            $q->whereIn('id_gym', $gymIdsArray);
        })->count();

        $prevTrainers = User::where('role', User::ROLE_TRAINER)->whereHas('gymStaff', function ($q) use ($gymIdsArray) {
            $q->whereIn('id_gym', $gymIdsArray);
        })->where('created_at', '<', $currMonthStart)->count();

        return [
            'activeTrainers' => $currTrainers,
            'trainersTrend' => $this->calculateTrend($currTrainers, $prevTrainers)
        ];
    }

    private function getUpcomingSessionsData(array $gymIdsArray, Carbon $now): \Illuminate\Support\Collection
    {
        $upcomingSessions = Session::with(['course', 'trainer'])
            ->whereHas('course', function ($q) use ($gymIdsArray) {
                $q->whereIn('id_gym', $gymIdsArray);
            })
            ->where('start_time', '>', $now)
            ->orderBy('start_time', 'asc')
            ->take(4)
            ->get();

        return $upcomingSessions->map(function ($session) {
            return [
                'id' => $session->id_session,
                'courseName' => $session->course->name,
                'startTime' => Carbon::parse($session->start_time)->format('H:i'),
                'trainer' => $session->trainer ? $session->trainer->name : 'N/A',
                'status' => $session->status
            ];
        });
    }

    private function getExpiringMembershipsData(array $gymIdsArray, Carbon $now): \Illuminate\Support\Collection
    {
        $expiringMemberships = Subscribe::with('user')
            ->whereIn('id_gym', $gymIdsArray)
            ->where('status', Subscribe::STATUS_ACTIVE)
            ->where('subscribe_date', '<=', $now->copy()->subDays(23))
            ->orderBy('subscribe_date', 'asc')
            ->take(3)
            ->get();

        return $expiringMemberships->map(function ($sub) use ($now) {
            $endDate = Carbon::parse($sub->subscribe_date)->addDays(30);
            return [
                'memberName' => $sub->user->name . ' ' . $sub->user->last_name,
                'expiryDate' => $endDate->format('M d'),
                'daysLeft' => max(0, $now->diffInDays($endDate, false))
            ];
        });
    }

    private function getActivityTrendsData(array $gymIdsArray): array
    {
        $activityTrends = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $dayLabel = $date->format('M d');

            $attendanceCount = Attendance::whereHas('session.course', function ($q) use ($gymIdsArray) {
                $q->whereIn('id_gym', $gymIdsArray);
            })
                ->whereDate('created_at', $date)
                ->where('status', Attendance::STATUS_PRESENT)
                ->count();

            $newSignups = Enrollment::whereIn('id_gym', $gymIdsArray)
                ->whereDate('created_at', $date)
                ->count();

            $expired = Enrollment::whereIn('id_gym', $gymIdsArray)
                ->where('status', 'expired')
                ->whereDate('updated_at', $date)
                ->count();

            $activityTrends[] = [
                'date' => $dayLabel,
                'attendance' => $attendanceCount,
                'signups' => $newSignups,
                'expired' => $expired
            ];
        }
        return $activityTrends;
    }

    private function getFocusAreasData(array $gymIdsArray, int $currActiveMembers, Carbon $now): array
    {
        $totalMembers = Enrollment::whereIn('id_gym', $gymIdsArray)->count();
        $retentionRate = $totalMembers > 0 ? round(($currActiveMembers / $totalMembers) * 100) : 0;

        $newMembersLast30 = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $now->copy()->subDays(30))
            ->get();
        $onboardedCount = 0;
        foreach ($newMembersLast30 as $member) {
            if (Attendance::where('id_member', $member->id_member)->exists()) {
                $onboardedCount++;
            }
        }
        $onboardingRate = $newMembersLast30->count() > 0 ? round(($onboardedCount / $newMembersLast30->count()) * 100) : 0;

        $totalProducts = Product::whereIn('id_gym', $gymIdsArray)->count();
        $lowStockProducts = Product::whereIn('id_gym', $gymIdsArray)->where('stock', '<', 10)->count();
        $equipmentHealth = $totalProducts > 0 ? round((($totalProducts - $lowStockProducts) / $totalProducts) * 100) : 100;

        $totalSessionsToday = Session::whereHas('course', function ($q) use ($gymIdsArray) {
            $q->whereIn('id_gym', $gymIdsArray);
        })
            ->whereDate('start_time', Carbon::today())
            ->count();
        $attendedSessionsToday = Attendance::whereHas('session.course', function ($q) use ($gymIdsArray) {
            $q->whereIn('id_gym', $gymIdsArray);
        })
            ->whereDate('created_at', Carbon::today())
            ->distinct('id_session')
            ->count('id_session');
        $staffEfficiency = $totalSessionsToday > 0 ? round(($attendedSessionsToday / $totalSessionsToday) * 100) : 0;
        return [
            ['label' => 'Retention Campaigns', 'value' => (int) $retentionRate, 'color' => 'bg-cyan-500'],
            ['label' => 'New Member Onboarding', 'value' => (int) $onboardingRate, 'color' => 'bg-teal-500'],
            ['label' => 'Equipment Upgrades', 'value' => (int) $equipmentHealth, 'color' => 'bg-amber-500'],
            ['label' => 'Staff Efficiency', 'value' => (int) $staffEfficiency, 'color' => 'bg-purple-500'],
        ];
    }

    private function getInventoryAlertsData(array $gymIdsArray): \Illuminate\Support\Collection
    {
        return Product::whereIn('id_gym', $gymIdsArray)
            ->where('stock', '<', 10)
            ->orderBy('stock', 'asc')
            ->take(3)
            ->get(['name', 'stock', 'price']);
    }

    private function getActiveGymIds(User $user): array
    {
        $allowedGymIds = $user->allowedGymIds()->toArray();
        $activeGymId = request()->header('X-Gym-Id');

        // If an active gym is requested and the user has access to it
        if ($activeGymId && in_array($activeGymId, $allowedGymIds)) {
            return [$activeGymId];
        }

        // Default to all allowed gyms
        return $allowedGymIds;
    }

    public function getDashboardStats(User $user): array
    {
        $now = Carbon::now();
        $gymIdsArray = $this->getActiveGymIds($user);

        // Reset submonth correctly by using start of months
        $currMonthStart = $now->copy()->startOfMonth();
        $prevMonthStart = $now->copy()->subMonthNoOverflow()->startOfMonth();
        $prevMonthEnd = $now->copy()->startOfMonth()->subSecond();

        // 1. Revenue (Raw)
        $currRevenue = Payment::whereIn('id_gym', $gymIdsArray)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        $prevRevenue = Payment::whereIn('id_gym', $gymIdsArray)
            ->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])
            ->sum('amount');

        // 2. Members (Raw)
        $currActiveMembers = Enrollment::join('users', 'enrollments.id_member', '=', 'users.id_user')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->where('enrollments.status', 'active')
            ->where('users.role', User::ROLE_MEMBER)
            ->distinct('enrollments.id_member')
            ->count('enrollments.id_member');

        $prevActiveMembers = Enrollment::join('users', 'enrollments.id_member', '=', 'users.id_user')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->where('enrollments.status', 'active')
            ->where('users.role', User::ROLE_MEMBER)
            ->where('enrollments.created_at', '<', $currMonthStart)
            ->distinct('enrollments.id_member')
            ->count('enrollments.id_member');

        $pendingMembers = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->where('status', 'pending')
            ->count();

        $expiredMembers = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->where('status', 'expired')
            ->count();

        // 3. New Memberships (Raw)
        $currNewMem = Enrollment::join('users', 'enrollments.id_member', '=', 'users.id_user')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->where('enrollments.created_at', '>=', $currMonthStart)
            ->where('users.role', User::ROLE_MEMBER)
            ->count();

        $prevNewMem = Enrollment::join('users', 'enrollments.id_member', '=', 'users.id_user')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->whereBetween('enrollments.created_at', [$prevMonthStart, $prevMonthEnd])
            ->where('users.role', User::ROLE_MEMBER)
            ->count();

        // 4. Trainers
        $currTrainers = User::where('role', User::ROLE_TRAINER)->whereHas('gymStaff', function ($q) use ($gymIdsArray) {
            $q->whereIn('id_gym', $gymIdsArray);
        })->count();

        // 5. Staff Snapshot (Raw)
        $staffMembers = User::whereIn('role', [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST, User::ROLE_OWNER])
            ->whereHas('gymStaff', function ($q) use ($gymIdsArray) {
                $q->whereIn('id_gym', $gymIdsArray);
            })
            ->take(4)
            ->get(['id_user', 'name', 'last_name', 'role', 'email', 'phone', 'profile_picture'])
            ->map(function ($user) {
                return [
                    'id_user' => $user->id_user,
                    'name' => $user->name . ' ' . $user->last_name,
                    'role' => $user->role,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'avatar' => $user->profile_picture ? (str_starts_with($user->profile_picture, 'http') ? $user->profile_picture : asset('storage/' . $user->profile_picture)) : 'https://ui-avatars.com/api/?name=' . urlencode($user->name) . '&background=0ea5e9&color=fff',
                ];
            });

        // 6. Revenue Sources (New)
        $totalPeriodAmount = Payment::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $now->copy()->startOfMonth())
            ->sum('amount');

        $sources = Payment::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $now->copy()->startOfMonth())
            ->selectRaw('type, sum(amount) as total')
            ->groupBy('type')
            ->get()
            ->map(function ($stat) use ($totalPeriodAmount) {
                return [
                    'type' => ucfirst(str_replace('_', ' ', $stat->type)),
                    'amount' => (float) $stat->total,
                    'percentage' => $totalPeriodAmount > 0 ? round(($stat->total / $totalPeriodAmount) * 100) : 0
                ];
            });

        // 7. Top Selling Products (New)
        $topProducts = DB::table('order_product')
            ->join('products', 'order_product.id_product', '=', 'products.id_product')
            ->whereIn('products.id_gym', $gymIdsArray)
            ->whereNull('products.deleted_at')
            ->select(
                'products.id_product',
                'products.name',
                'products.image',
                DB::raw('SUM(order_product.quantity) as total_sold'),
                DB::raw('SUM(order_product.quantity * order_product.price) as revenue')
            )
            ->groupBy('products.id_product', 'products.name', 'products.image')
            ->orderByDesc('total_sold')
            ->orderByDesc('revenue')
            ->take(3)
            ->get();

        // 8. Top Courses by Active Enrollments
        $topCourses = DB::table('courses')
            ->leftJoin('enrollments', function ($join) {
                $join->on('courses.id_course', '=', 'enrollments.id_course')
                    ->where('enrollments.status', '=', 'active');
            })
            ->whereIn('courses.id_gym', $gymIdsArray)
            ->whereNull('courses.deleted_at')
            ->select(
                'courses.id_course',
                'courses.name',
                'courses.image',
                DB::raw('MAX(courses.max_capacity) as capacity'),
                DB::raw('COUNT(DISTINCT enrollments.id_member) as enrolled'),
                DB::raw('CASE WHEN MAX(courses.max_capacity) > 0 THEN ROUND((COUNT(DISTINCT enrollments.id_member) / MAX(courses.max_capacity)) * 100, 1) ELSE 0 END as occupancy')
            )
            ->groupBy('courses.id_course', 'courses.name', 'courses.image')
            ->orderByDesc('enrolled')
            ->orderBy('courses.name')
            ->take(3)
            ->get();

        // 9. Top Membership Plans by Sales
        $topMembershipPlans = DB::table('enrollments')
            ->join('membership_plans', 'enrollments.id_plan', '=', 'membership_plans.id')
            ->whereIn('enrollments.id_gym', $gymIdsArray)
            ->whereNull('membership_plans.deleted_at')
            ->select(
                'membership_plans.id',
                'membership_plans.name',
                'membership_plans.type',
                'membership_plans.price',
                DB::raw('COUNT(enrollments.id) as total_sold'),
                DB::raw("SUM(CASE WHEN enrollments.status = 'active' THEN 1 ELSE 0 END) as active_members"),
                DB::raw('SUM(membership_plans.price) as estimated_revenue')
            )
            ->groupBy('membership_plans.id', 'membership_plans.name', 'membership_plans.type', 'membership_plans.price')
            ->orderByDesc('total_sold')
            ->orderByDesc('estimated_revenue')
            ->take(3)
            ->get();

        return [
            "stats" => [
                "totalRevenue" => (float) $currRevenue,
                "revenueTrend" => $prevRevenue > 0 ? round((($currRevenue - $prevRevenue) / $prevRevenue) * 100, 1) : ($currRevenue > 0 ? 100.0 : 0.0),

                "activeMembers" => (int) $currActiveMembers,
                "membersTrend" => $prevActiveMembers > 0 ? round((($currActiveMembers - $prevActiveMembers) / $prevActiveMembers) * 100, 1) : ($currActiveMembers > 0 ? 100.0 : 0.0),

                "newMemberships" => (int) $currNewMem,
                "membershipsTrend" => $prevNewMem > 0 ? round((($currNewMem - $prevNewMem) / $prevNewMem) * 100, 1) : ($currNewMem > 0 ? 100.0 : 0.0),

                "activeTrainers" => (int) $currTrainers,
                "trainersTrend" => 0.0, // Static for now as we don't track prev trainers easily here

                "pendingMemberships" => (int) $pendingMembers,
                "expiredMemberships" => (int) $expiredMembers,
                "totalMembers" => (int) Enrollment::whereIn('id_gym', $gymIdsArray)->count(),
                "onboardedCount" => (int) Enrollment::whereIn('id_gym', $gymIdsArray)
                    ->where('created_at', '>=', $now->copy()->subDays(30))
                    ->whereHas('member.attendances')
                    ->count(),
                "newMembersLast30" => (int) Enrollment::whereIn('id_gym', $gymIdsArray)
                    ->where('created_at', '>=', $now->copy()->subDays(30))
                    ->count(),
                "lowStockCount" => (int) Product::whereIn('id_gym', $gymIdsArray)->where('stock', '<', 5)->count(),
                "totalProducts" => (int) Product::whereIn('id_gym', $gymIdsArray)->count(),
            ],
            "upcomingSessions" => $this->getUpcomingSessionsData($gymIdsArray, $now),
            "inventoryAlerts" => $this->getInventoryAlertsData($gymIdsArray),
            "expiringMemberships" => $this->getExpiringMembershipsData($gymIdsArray, $now),
            "activityTrends" => $this->getActivityTrendsData($gymIdsArray),
            "staffSnapshot" => $staffMembers,
            "revenueSources" => $sources,
            "topProducts" => $topProducts,
            "topCourses" => $topCourses,
            "topMembershipPlans" => $topMembershipPlans
        ];
    }

    public function getMemberStats(User $user): array
    {
        $gymIdsArray = $this->getActiveGymIds($user);

        // 1. Total Attendance
        $totalAttendance = Attendance::where('id_member', $user->id_user)->count();

        // 2. Wallets
        $wallets = \App\Models\Wallet::where('user_id', $user->id_user)
            ->join('gyms', 'wallets.id_gym', '=', 'gyms.id_gym')
            ->select('wallets.id_gym', 'wallets.balance', 'gyms.name as gym_name')
            ->get();

        // Calculate total balance across all wallets for backward compatibility or global view
        $walletBalance = $wallets->sum('balance');

        // 3. Active Subscriptions
        $activeSubCount = Subscribe::where('id_user', $user->id_user)
            ->where('status', Subscribe::STATUS_ACTIVE)
            ->count();

        // 4. Enrollments
        $enrollmentCount = $user->enrollments()->count();

        return [
            "stats" => [
                "totalAttendance" => $totalAttendance,
                "walletBalance" => (float) $walletBalance,
                "wallets" => $wallets,
                "activeSubscriptions" => $activeSubCount,
                "enrollments" => $enrollmentCount,
                "calories" => $user->manual_calories,
                "protein" => $user->manual_protein,
                "carbs" => $user->manual_carbs,
                "fats" => $user->manual_fats,
                "water" => ($user->updated_at && \Carbon\Carbon::parse($user->updated_at)->isToday()) ? (float) $user->manual_water : 0,
                "weight" => $user->manual_weight,
                "height" => $user->manual_height,
                "evolutionPoints" => $user->evolution_points
            ],
            "personalRecords" => $this->getPersonalRecords($user),
            "bodyMeasurements" => $this->getBodyMeasurements($user),
            "aiAdvice" => $this->generateAiAdvice($user, $totalAttendance),
            "projection" => $this->calculateProjection($user),
            "user" => [
                "name" => $user->name,
                "last_name" => $user->last_name,
                "email" => $user->email,
                "role" => $user->role,
                "nutritionist_advisory" => $user->nutritionist_advisory,
                "nutritionist_notes" => $user->nutritionist_notes,
                "updated_at" => $user->updated_at,
                "nutritionist" => $user->nutritionPlansAsMember()
                    ->where('is_active', true)
                    ->with('nutritionist')
                    ->first()?->nutritionist
            ]
        ];
    }

    private function getPersonalRecords(User $user): array
    {
        return DB::table('workout_sets')
            ->join('workout_exercises', 'workout_sets.id_exercise', '=', 'workout_exercises.id')
            ->join('workout_logs', 'workout_exercises.id_workout', '=', 'workout_logs.id')
            ->where('workout_logs.id_member', $user->id_user)
            ->select('workout_exercises.exercise_name', DB::raw('MAX(workout_sets.weight) as max_weight'), DB::raw('MAX(workout_logs.workout_date) as date'))
            ->groupBy('workout_exercises.exercise_name')
            ->orderBy('max_weight', 'desc')
            ->take(5)
            ->get()
            ->map(function ($pr) {
                return [
                    'exercise' => $pr->exercise_name,
                    'weight' => (float) $pr->max_weight,
                    'date' => Carbon::parse($pr->date)->format('Y-m-d'),
                    'trend' => 'Calculated'
                ];
            })
            ->toArray();
    }

    private function getBodyMeasurements(User $user): array
    {
        // For now, return what we have in User model, could be expanded to a dedicated table
        return [
            'chest' => 0, // Placeholder if not in DB yet
            'waist' => 0,
            'biceps' => 0,
            'thighs' => 0,
            'lastUpdate' => $user->updated_at->format('Y-m-d')
        ];
    }

    private function generateAiAdvice(User $user, int $totalAttendance): array
    {
        $advice = [];
        $weight = $user->manual_weight ?: 70;

        if ($user->manual_protein < ($weight * 1.5)) {
            $advice[] = "Protein intake is below the optimal threshold for muscle repair. Aim for " . round($weight * 1.8) . "g.";
        }

        if ($user->manual_water < 2.5) {
            $advice[] = "Hydration alert: Your metabolic efficiency is dropping. Sync 1L of water in the next 2 hours.";
        }

        if ($totalAttendance > 20) {
            $advice[] = "High-fidelity training consistency detected. You are entering the 'Advanced Init' phase.";
        }

        return $advice ?: ["Bio-Pulse data synchronized. Maintain current protocol for 7 days."];
    }

    private function calculateProjection(User $user): array
    {
        $current = $user->manual_weight ?: 70;
        $target = $user->target_weight ?: $current;
        $diff = $target - $current;

        // Simple linear projection (e.g. 0.5kg per month)
        $rate = 0.5;
        if ($diff < 0)
            $rate = -0.5; // Losing weight

        return [
            'month1' => round($current + ($rate * 1), 1),
            'month3' => round($current + ($rate * 3), 1),
            'month6' => round($current + ($rate * 6), 1),
            'desc' => abs($diff) < 1 ? 'Stability Protocol' : ($diff < 0 ? 'Caloric Deficit Adaptation' : 'Muscle Hypertrophy Phase')
        ];
    }

    public function getActivityChartData(User $user): array
    {
        $gymIdsArray = $this->getActiveGymIds($user);
        $chartData = [];
        $now = Carbon::now();

        // Last 14 days
        for ($i = 13; $i >= 0; $i--) {
            $date = $now->copy()->subDays($i);
            $dayLabel = $date->format('d M');

            $attendance = Attendance::whereHas('session.course', function ($q) use ($gymIdsArray) {
                $q->whereIn('id_gym', $gymIdsArray);
            })
                ->whereDate('created_at', $date)
                ->where('status', Attendance::STATUS_PRESENT)
                ->count();

            $signups = Enrollment::whereIn('id_gym', $gymIdsArray)
                ->whereDate('created_at', $date)
                ->count();

            $expired = Enrollment::whereIn('id_gym', $gymIdsArray)
                ->where('status', 'expired')
                ->whereDate('updated_at', $date)
                ->count();

            $chartData[] = [
                'date' => $dayLabel,
                'attendance' => $attendance,
                'signups' => $signups,
                'expired' => $expired
            ];
        }

        return $chartData;
    }

    public function getRevenueChart(User $user, string $filter = 'last_6_months'): array
    {
        $gymIdsArray = $this->getActiveGymIds($user);
        $chartData = [];

        $now = Carbon::now();
        if ($filter === 'this_year') {
            $monthsToFetch = $now->month;
            $startPeriod = $now->copy()->startOfYear();
        } else {
            $monthsToFetch = 6;
            $startPeriod = $now->copy()->subMonthsNoOverflow(5)->startOfMonth();
        }

        for ($i = 0; $i < $monthsToFetch; $i++) {
            $monthDate = $startPeriod->copy()->addMonthsNoOverflow($i);
            $monthStart = $monthDate->copy()->startOfMonth();
            $monthEnd = $monthDate->copy()->endOfMonth();

            $amount = Payment::whereIn('id_gym', $gymIdsArray)
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->sum('amount');

            $chartData[] = [
                'month' => $monthDate->format('M'),
                'amount' => (float) $amount
            ];
        }

        return $chartData;
    }

    public function getAdvancedRevenueStats(User $user, string $filter = 'last_6_months'): array
    {
        $gymIdsArray = $this->getActiveGymIds($user);

        $now = Carbon::now();
        $chartData = [];
        $sources = [];
        $methods = [];

        $memberGrowth = [];
        $monthKeys = [];

        if ($filter === 'this_year') {
            $monthsToFetch = $now->month;
            $startPeriod = $now->copy()->startOfYear();
        } else {
            $monthsToFetch = 6;
            $startPeriod = $now->copy()->subMonthsNoOverflow(5)->startOfMonth();
        }

        // 1. Chart Data (Revenue & Members)
        for ($i = 0; $i < $monthsToFetch; $i++) {
            $monthDate = $startPeriod->copy()->addMonthsNoOverflow($i);
            $monthStart = $monthDate->copy()->startOfMonth();
            $monthEnd = $monthDate->copy()->endOfMonth();

            $amount = Payment::whereIn('id_gym', $gymIdsArray)
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->sum('amount');

            $chartData[] = [
                'month' => $monthDate->format('M'),
                'amount' => (int) $amount
            ];
            $monthKeys[] = $monthDate->format('Y-m');

            // Member Growth calculation
            $activeCount = Enrollment::whereIn('id_gym', $gymIdsArray)
                ->where('created_at', '<=', $monthEnd)
                ->count();

            $memberGrowth[] = [
                'month' => $monthDate->format('M'),
                'count' => $activeCount
            ];
        }

        // 2. Breakdown by Type (Sources)
        $totalPeriodAmount = Payment::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $startPeriod)
            ->sum('amount');

        $typeAmounts = Payment::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $startPeriod)
            ->selectRaw('type, sum(amount) as total')
            ->groupBy('type')
            ->get();

        foreach ($typeAmounts as $stat) {
            $sources[] = [
                'type' => $stat->type,
                'amount' => (float) $stat->total,
                'percentage' => $totalPeriodAmount > 0 ? round(($stat->total / $totalPeriodAmount) * 100, 2) : 0
            ];
        }

        // 3. Breakdown by Method
        $methodAmounts = Payment::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $startPeriod)
            ->selectRaw('method, sum(amount) as total')
            ->groupBy('method')
            ->get();

        foreach ($methodAmounts as $stat) {
            $methods[] = [
                'method' => $stat->method,
                'amount' => (float) $stat->total,
                'percentage' => $totalPeriodAmount > 0 ? round(($stat->total / $totalPeriodAmount) * 100, 2) : 0
            ];
        }

        // 3.5 Monthly category trend (real data for "Trend" sparklines)
        $monthIndexByKey = array_flip($monthKeys);
        $categoryTrends = [];

        $categoryTrendRows = Payment::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $startPeriod)
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month_key, type, SUM(amount) as total")
            ->groupBy('month_key', 'type')
            ->get();

        foreach ($categoryTrendRows as $row) {
            $monthKey = (string) $row->month_key;
            if (!array_key_exists($monthKey, $monthIndexByKey)) {
                continue;
            }

            $category = $this->normalizeRevenueCategory((string) $row->type);
            if ($category === 'Platform') {
                continue;
            }

            if (!isset($categoryTrends[$category])) {
                $categoryTrends[$category] = array_fill(0, $monthsToFetch, 0.0);
            }

            $categoryTrends[$category][$monthIndexByKey[$monthKey]] += (float) $row->total;
        }

        // 4. Growth Calculations
        $currentMonthRevenue = !empty($chartData) ? end($chartData)['amount'] : 0;
        $prevMonthRevenue = count($chartData) >= 2 ? $chartData[count($chartData) - 2]['amount'] : 0;
        $momGrowth = $prevMonthRevenue > 0 ? (($currentMonthRevenue - $prevMonthRevenue) / $prevMonthRevenue) * 100 : 0;

        $ytdRevenue = Payment::whereIn('id_gym', $gymIdsArray)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        $avgMonthlyRevenue = count($chartData) > 0 ? $totalPeriodAmount / count($chartData) : 0;
        $projection = $currentMonthRevenue + ($currentMonthRevenue * ($momGrowth / 100));

        $currentMemberCount = !empty($memberGrowth) ? end($memberGrowth)['count'] : 0;
        $arpu = $currentMemberCount > 0 ? $totalPeriodAmount / $currentMemberCount : 0;

        // 5. Top Selling Products
        $topProducts = DB::table('order_product')
            ->join('products', 'order_product.id_product', '=', 'products.id_product')
            ->whereIn('products.id_gym', $gymIdsArray)
            ->select('products.name', 'products.price', 'products.category', DB::raw('SUM(order_product.quantity) as total_sold'), DB::raw('SUM(order_product.quantity * order_product.price) as total_revenue'))
            ->groupBy('products.id_product', 'products.name', 'products.price', 'products.category')
            ->orderByDesc('total_sold')
            ->take(5)
            ->get();

        // 6. Enrollment Progress
        $activeEnrollments = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->where('status', 'active')
            ->count();
        $totalEnrollments = Enrollment::whereIn('id_gym', $gymIdsArray)->count();
        $enrollmentRate = $totalEnrollments > 0 ? round(($activeEnrollments / $totalEnrollments) * 100, 2) : 0;

        // Recent Enrollment Growth (this month)
        $newEnrollments = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->count();

        $expiringSoon = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->where('status', 'active')
            ->where('enrollment_date', '<=', $now->copy()->subDays(25))
            ->count();

        // 7. Top Performing Courses (by Revenue & Attendance)
        $topCourses = Payment::whereIn('id_gym', $gymIdsArray)
            ->whereNotNull('id_course')
            ->where('type', Payment::TYPE_COURSE)
            ->selectRaw('id_course, sum(amount) as revenue, count(*) as enrollments')
            ->with('course:id_course,name')
            ->groupBy('id_course')
            ->orderByDesc('revenue')
            ->take(4)
            ->get();

        // 8. Top Performing Events (by Attendance)
        $topEvents = DB::table('attendanceEvent')
            ->join('events', 'attendanceEvent.id_event', '=', 'events.id_event')
            ->whereIn('events.id_gym', $gymIdsArray)
            ->select('events.title', DB::raw('count(attendanceEvent.id_attendance_event) as participants'))
            ->groupBy('events.id_event', 'events.title')
            ->orderByDesc('participants')
            ->take(4)
            ->get();

        $activeEventsCount = Event::whereIn('id_gym', $gymIdsArray)
            ->where('end_date', '>=', $now)
            ->count();

        return [
            'totalRevenue' => $totalPeriodAmount,
            'chartData' => $chartData,
            'memberGrowth' => $memberGrowth,
            'sources' => $sources,
            'methods' => $methods,
            'categoryTrends' => $categoryTrends,
            'topProducts' => $topProducts,
            'topCourses' => $topCourses,
            'topEvents' => $topEvents,
            'paymentHeatmap' => $this->getPaymentHeatmap($gymIdsArray, $startPeriod),
            'enrollmentStats' => [
                'active' => $activeEnrollments,
                'total' => $totalEnrollments,
                'rate' => $enrollmentRate,
                'newThisMonth' => $newEnrollments,
                'expiringSoon' => $expiringSoon,
                'activeEvents' => $activeEventsCount
            ],
            'growth' => [
                'momGrowth' => round($momGrowth, 2),
                'ytdRevenue' => $ytdRevenue,
                'averageMonthly' => round($avgMonthlyRevenue, 2),
                'forecast' => round($projection, 2),
                'arpu' => round($arpu, 2)
            ]
        ];
    }

    /**
     * Build a payment-activity heatmap grouped by day-of-week and time-of-day buckets.
     * Returns array of { name: 'Mon', data: [ { x: '12am', y: count }, ... ] }
     */
    private function getPaymentHeatmap(array $gymIdsArray, Carbon $startPeriod): array
    {
        // Time-slot buckets: label => [from_hour, to_hour]
        $slots = [
            '12am' => [0, 1],
            '2am'  => [2, 3],
            '4am'  => [4, 5],
            '6am'  => [6, 7],
            '8am'  => [8, 9],
            '10am' => [10, 11],
            '12pm' => [12, 13],
            '2pm'  => [14, 15],
            '4pm'  => [16, 17],
            '6pm'  => [18, 19],
            '8pm'  => [20, 21],
            '10pm' => [22, 23],
        ];

        // DAYOFWEEK: 1=Sunday … 7=Saturday in MySQL
        $days = [
            2 => 'Mon',
            3 => 'Tue',
            4 => 'Wed',
            5 => 'Thu',
            6 => 'Fri',
            7 => 'Sat',
            1 => 'Sun',
        ];

        // Query raw counts grouped by day-of-week and hour
        $rows = Payment::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $startPeriod)
            ->selectRaw('DAYOFWEEK(created_at) as dow, HOUR(created_at) as hr, COUNT(*) as cnt')
            ->groupBy('dow', 'hr')
            ->get();

        // Build a lookup: dow => hr => cnt
        $lookup = [];
        foreach ($rows as $row) {
            $lookup[(int) $row->dow][(int) $row->hr] = (int) $row->cnt;
        }

        // Assemble series
        $series = [];
        foreach ($days as $dow => $dayName) {
            $data = [];
            foreach ($slots as $label => [$from, $to]) {
                // Sum counts across the 2-hour window
                $count = ($lookup[$dow][$from] ?? 0) + ($lookup[$dow][$to] ?? 0);
                $data[] = ['x' => $label, 'y' => $count];
            }
            $series[] = ['name' => $dayName, 'data' => $data];
        }

        return $series;
    }

    /**
     * Get recent check-ins for the owner's dashboard
     * 
     * @param User $user The authenticated user
     * @param int $limit Number of recent check-ins to return
     * @return array
     */
    public function getRecentCheckins(User $user, int $limit = 5): array
    {
        $gymIdsArray = $this->getActiveGymIds($user);

        $query = Attendance::with('member')
            ->where('status', Attendance::STATUS_PRESENT)
            ->orderBy('created_at', 'desc');

        if ($user->role === User::ROLE_OWNER) {
            $query->whereHas('session.course', function ($q) use ($gymIdsArray) {
                $q->whereIn('id_gym', $gymIdsArray);
            });
        } elseif ($user->role === User::ROLE_MEMBER) {
            $query->where('id_member', $user->id_user);
        }

        $attendances = $query->take($limit)->get();

        return $attendances->map(function (Attendance $attendance) {
            $member = $attendance->member;

            $nameStr = 'Unknown Member';
            $initials = '??';

            if ($member) {
                $firstName = trim($member->name ?? '');
                $lastName = trim($member->last_name ?? '');

                $nameParts = array_filter([$firstName, $lastName]);
                if (!empty($nameParts)) {
                    $nameStr = implode(' ', $nameParts);
                }

                $firstInitial = $firstName ? mb_strtoupper(mb_substr($firstName, 0, 1)) : '';
                $lastInitial = $lastName ? mb_strtoupper(mb_substr($lastName, 0, 1)) : '';

                $initials = $firstInitial . $lastInitial;
                if (empty($initials)) {
                    $initials = '??';
                }
            }

            return [
                'id' => $attendance->getKey(),
                'memberName' => $nameStr,
                'initials' => $initials,
                'timeAgo' => $attendance->created_at ? $attendance->created_at->diffForHumans() : 'Unknown',
            ];
        })->toArray();
    }
}
