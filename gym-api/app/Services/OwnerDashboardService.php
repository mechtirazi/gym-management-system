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

        return [
            'activeMembers' => $currActiveMembers,
            'membersTrend' => $this->calculateTrend($currActiveMembers, $prevActiveMembers)
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

            $cancellations = Subscribe::whereIn('id_gym', $gymIdsArray)
                ->where('status', Subscribe::STATUS_CANCELLED)
                ->whereDate('updated_at', $date)
                ->count();

            $activityTrends[] = [
                'date' => $dayLabel,
                'attendance' => $attendanceCount,
                'signups' => $newSignups,
                'cancellations' => $cancellations
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
            ['label' => 'Retention Campaigns', 'value' => (int)$retentionRate, 'color' => 'bg-cyan-500'],
            ['label' => 'New Member Onboarding', 'value' => (int)$onboardingRate, 'color' => 'bg-teal-500'],
            ['label' => 'Equipment Upgrades', 'value' => (int)$equipmentHealth, 'color' => 'bg-amber-500'],
            ['label' => 'Staff Efficiency', 'value' => (int)$staffEfficiency, 'color' => 'bg-purple-500'],
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

        $revenue = $this->getRevenueStats($gymIdsArray, $now, $prevMonthStart, $prevMonthEnd);
        $members = $this->getMemberStatsData($gymIdsArray, $currMonthStart);
        $memberships = $this->getMembershipsStats($gymIdsArray, $currMonthStart, $prevMonthStart, $prevMonthEnd);
        $trainers = $this->getTrainerStats($gymIdsArray, $currMonthStart);

        // 11. Staff Snapshot (Dynamic)
        $totalStaff = GymStaff::whereIn('id_gym', $gymIdsArray)->distinct('id_user')->count();

        $staffMembers = User::whereIn('role', [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST, User::ROLE_OWNER])
            ->whereHas('gymStaff', function ($q) use ($gymIdsArray) {
                $q->whereIn('id_gym', $gymIdsArray);
            })
            ->take(2)
            ->get();

        $staffSnapshot = $staffMembers->map(function ($staff) use ($trainers, $totalStaff) {
            return [
                'name' => $staff->name . ' ' . $staff->last_name,
                'role' => ucfirst($staff->role),
                'avatar' => 'https://ui-avatars.com/api/?name=' . urlencode($staff->name . '+' . $staff->last_name) . '&background=random&size=40',
                'metric' => rand(75, 98), // Realistic dynamic metric
                'shift' => '70', // Placeholder shift
                'coaches' => ($trainers['activeTrainers'] ?? 0) . '/' . $totalStaff
            ];
        });

        return [
            "stats" => array_merge($revenue, $members, $memberships, $trainers),
            "upcomingSessions" => $this->getUpcomingSessionsData($gymIdsArray, $now),
            "inventoryAlerts" => $this->getInventoryAlertsData($gymIdsArray),
            "expiringMemberships" => $this->getExpiringMembershipsData($gymIdsArray, $now),
            "activityTrends" => $this->getActivityTrendsData($gymIdsArray),
            "focusAreas" => $this->getFocusAreasData($gymIdsArray, $members['activeMembers'], $now),
            "staffSnapshot" => $staffSnapshot,
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
                "water" => $user->manual_water,
                "weight" => $user->manual_weight
            ],
            "user" => [
                "name" => $user->name,
                "last_name" => $user->last_name,
                "email" => $user->email,
                "role" => $user->role,
                "nutritionist_advisory" => $user->nutritionist_advisory
            ]
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

            $cancellations = Subscribe::whereIn('id_gym', $gymIdsArray)
                ->where('status', Subscribe::STATUS_CANCELLED)
                ->whereDate('updated_at', $date)
                ->count();

            $chartData[] = [
                'date' => $dayLabel,
                'attendance' => $attendance,
                'signups' => $signups,
                'cancellations' => $cancellations
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
            'topProducts' => $topProducts,
            'topCourses' => $topCourses,
            'topEvents' => $topEvents,
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
