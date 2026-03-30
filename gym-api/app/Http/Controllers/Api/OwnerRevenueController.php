<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OwnerDashboardService;
use Illuminate\Http\Request;

class OwnerRevenueController extends Controller
{
    protected $dashboardService;

    public function __construct(OwnerDashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Returns the advanced revenue stats with breakdown for the revenue page.
     */
    public function getAdvancedStats(Request $request)
    {
        $user = $request->user();
        $filter = $request->query('filter', 'last_6_months');
        
        $stats = $this->dashboardService->getAdvancedRevenueStats($user, $filter);
        
        return response()->json($stats);
    }
}
