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
        if ((float)$previous == 0.0) {
            return $current > 0 ? 100 : 0;
        }
        return (int) round((($current - $previous) / $previous) * 100);
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

        // 1. Stats Calculation
        // Revenue (current month vs previous month)
        $currRevenue = Payment::whereIn('id_gym', $gymIdsArray)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');
        
        $prevRevenue = Payment::whereIn('id_gym', $gymIdsArray)
            ->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])
            ->sum('amount');

        $revenueTrend = $this->calculateTrend($currRevenue, $prevRevenue);

        // 2. Active Members
        $currActiveMembers = Subscribe::whereIn('id_gym', $gymIdsArray)
            ->where('status', Subscribe::STATUS_ACTIVE)
            ->count();
            
        $prevActiveMembers = Subscribe::whereIn('id_gym', $gymIdsArray)
            ->where('status', Subscribe::STATUS_ACTIVE)
            ->where('created_at', '<', $currMonthStart)
            ->count();
        
        $membersTrend = $this->calculateTrend($currActiveMembers, $prevActiveMembers);

        // 3. New Memberships
        $currNewMem = Subscribe::whereIn('id_gym', $gymIdsArray)
            ->where('created_at', '>=', $currMonthStart)
            ->count();
        
        $prevNewMem = Subscribe::whereIn('id_gym', $gymIdsArray)
            ->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])
            ->count();
            
        $membershipsTrend = $this->calculateTrend($currNewMem, $prevNewMem);

        // 4. Active Trainers
        $currTrainers = User::where('role', User::ROLE_TRAINER)->whereHas('gymStaff', function($q) use ($gymIdsArray) {
            $q->whereIn('id_gym', $gymIdsArray);
        })->count();
        
        $prevTrainers = User::where('role', User::ROLE_TRAINER)->whereHas('gymStaff', function($q) use ($gymIdsArray) {
            $q->whereIn('id_gym', $gymIdsArray);
        })->where('created_at', '<', $currMonthStart)->count();

        $trainersTrend = $this->calculateTrend($currTrainers, $prevTrainers);

        // 5. Upcoming Sessions
        $upcomingSessions = Session::with(['course', 'trainer'])
            ->whereHas('course', function($q) use ($gymIdsArray) {
                $q->whereIn('id_gym', $gymIdsArray);
            })
            ->where('start_time', '>', $now)
            ->orderBy('start_time', 'asc')
            ->take(4)
            ->get();

        $sessionData = $upcomingSessions->map(function($session) {
            return [
                'id' => $session->id_session,
                'courseName' => $session->course->name,
                'startTime' => Carbon::parse($session->start_time)->format('H:i'),
                'trainer' => $session->trainer ? $session->trainer->name : 'N/A',
                'status' => $session->status
            ];
        });

        // 6. Inventory Alerts (Low Stock)
        $inventoryAlerts = Product::whereIn('id_gym', $gymIdsArray)
            ->where('stock', '<', 10)
            ->orderBy('stock', 'asc')
            ->take(3)
            ->get(['name', 'stock', 'price']);

        // 7. Expiring Memberships (Assuming 30-day validity from subscribe_date)
        $expiringMemberships = Subscribe::with('user')
            ->whereIn('id_gym', $gymIdsArray)
            ->where('status', Subscribe::STATUS_ACTIVE)
            ->where('subscribe_date', '<=', $now->copy()->subDays(23))
            ->orderBy('subscribe_date', 'asc')
            ->take(3)
            ->get();

        $expiringData = $expiringMemberships->map(function($sub) use ($now) {
            $endDate = Carbon::parse($sub->subscribe_date)->addDays(30);
            return [
                'memberName' => $sub->user->name . ' ' . $sub->user->last_name,
                'expiryDate' => $endDate->format('M d'),
                'daysLeft' => max(0, $now->diffInDays($endDate, false))
            ];
        });

        // 8. Gym Occupancy
        $gym = Gym::whereIn('id_gym', $gymIdsArray)->first();
        $currentPresent = Attendance::whereHas('session.course', function($q) use ($gymIdsArray) {
            $q->whereIn('id_gym', $gymIdsArray);
        })
        ->where('status', Attendance::STATUS_PRESENT)
        ->whereDate('created_at', Carbon::today())
        ->count();

        return [
            "stats" => [
                "totalRevenue" => (float) $currRevenue,
                "revenueTrend" => $revenueTrend,
                "activeMembers" => $currActiveMembers,
                "membersTrend" => $membersTrend,
                "newMemberships" => $currNewMem,
                "membershipsTrend" => $membershipsTrend,
                "activeTrainers" => $currTrainers,
                "trainersTrend" => $trainersTrend
            ],
            "upcomingSessions" => $sessionData,
            "inventoryAlerts" => $inventoryAlerts,
            "expiringMemberships" => $expiringData,
            "occupancy" => [
                "current" => $currentPresent,
                "capacity" => $gym ? $gym->capacity : 100,
                "percentage" => $gym && $gym->capacity > 0 ? round(($currentPresent / $gym->capacity) * 100) : 0,
                "gymName" => $gym ? $gym->name : 'Main Gym'
            ]
        ];
    }

    public function getMemberStats(User $user): array
    {
        $gymIdsArray = $this->getActiveGymIds($user);

        // 1. Total Attendance
        $totalAttendance = Attendance::where('id_member', $user->id_user)->count();
        
        // 2. Wallet Balance
        $walletBalance = $user->wallet ? $user->wallet->balance : 0.0;
        
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
                "activeSubscriptions" => $activeSubCount,
                "enrollments" => $enrollmentCount
            ]
        ];
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
            $activeCount = Subscribe::whereIn('id_gym', $gymIdsArray)
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
        $activeEnrollments = \App\Models\Enrollment::whereIn('id_gym', $gymIdsArray)
            ->where('status', 'active')
            ->count();
        $totalEnrollments = \App\Models\Enrollment::whereIn('id_gym', $gymIdsArray)->count();
        $enrollmentRate = $totalEnrollments > 0 ? round(($activeEnrollments / $totalEnrollments) * 100, 2) : 0;

        // Recent Enrollment Growth (this month)
        $newEnrollments = Enrollment::whereIn('id_gym', $gymIdsArray)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->count();
            
        $expiringSoon = Subscribe::whereIn('id_gym', $gymIdsArray)
            ->where('status', Subscribe::STATUS_ACTIVE)
            ->where('subscribe_date', '<=', $now->copy()->subDays(25))
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

        $activeEventsCount = \App\Models\Event::whereIn('id_gym', $gymIdsArray)
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

        return $attendances->map(function ($attendance) {
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
