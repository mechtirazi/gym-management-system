<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OwnerDashboardService;
use Illuminate\Http\Request;

class OwnerDashboardController extends Controller
{
    protected $dashboardService;

    public function __construct(OwnerDashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function getDashboardStats(Request $request)
    {
        $user = $request->user();

        if ($user->role === \App\Models\User::ROLE_OWNER) {
            $stats = $this->dashboardService->getDashboardStats($user);
        }
        else {
            $stats = $this->dashboardService->getMemberStats($user);
        }

        return response()->json($stats);
    }

    /**
     * Returns the monthly revenue chart data.
     */
    public function getRevenueChart(Request $request)
    {
        $user = $request->user();
        $filter = $request->query('filter', 'last_6_months');

        $chartData = $this->dashboardService->getRevenueChart($user, $filter);

        return response()->json($chartData);
    }

    /**
     * Returns the activity trends chart data (attendance, signups, cancellations).
     */
    public function getActivityChart(Request $request)
    {
        $user = $request->user();

        $chartData = $this->dashboardService->getActivityChartData($user);

        return response()->json($chartData);
    }

    /**
     * Returns the top recent gym member check-ins for the dashboard activity feed.
     */
    public function getRecentCheckins(Request $request)
    {
        $user = $request->user();

        $checkins = $this->dashboardService->getRecentCheckins($user);

        return response()->json($checkins);
    }
}
