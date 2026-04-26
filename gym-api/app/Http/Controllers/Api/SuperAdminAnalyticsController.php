<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\Payment;
use App\Models\Subscribe;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SuperAdminAnalyticsController extends Controller
{
    /**
     * GET /api/admin/metrics/overview
     *
     * Return platform-wide KPIs for the Super Admin "God View" dashboard.
     */
    public function getOverviewMetrics()
    {
        $data = Cache::remember('super_admin_overview_metrics', now()->addMinutes(30), function () {

            $now = Carbon::now();

            // Total Active Gyms
            $totalActiveGyms = Gym::where('status', '!=', 'suspended')->count();

            // Total Active Platform Users (Owners)
            $totalActiveMembers = User::where('role', User::ROLE_OWNER)->count();

            // MRR (Monthly Recurring Revenue)
            $mrr = Payment::whereYear('created_at', $now->year)
                ->whereMonth('created_at', $now->month)
                ->sum('amount');

            // Recent Churn
            $thirtyDaysAgo = $now->copy()->subDays(30);

            $recentChurn = DB::table('subscribe') 
                ->select('id_gym')
                ->where('status', 'expired') // Assuming 'expired' string as status
                ->where('updated_at', '>=', $thirtyDaysAgo)
                ->whereNotIn('id_gym', function ($sub) {
                    $sub->select('id_gym')
                        ->from('subscribe')
                        ->where('status', 'active');
                })
                ->distinct()
                ->count('id_gym');

            return [
                'total_active_gyms'    => $totalActiveGyms,
                'total_active_members' => $totalActiveMembers,
                'mrr'                  => round((float) $mrr, 2),
                'recent_churn'         => $recentChurn,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
