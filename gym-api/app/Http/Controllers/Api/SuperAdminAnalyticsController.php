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
        $now = Carbon::now();

        // Total Active Gyms
        $totalActiveGyms = Gym::where('status', '!=', 'suspended')->count();

        // Total Active Platform Users (Owners)
        $totalActiveOwners = User::where('role', User::ROLE_OWNER)->count();

        // Platform Members Stats
        $totalMembers = User::where('role', User::ROLE_MEMBER)->count();
        
        // Upgraded Members (Global Platform Elite Protocol)
        $upgradedMembers = User::where('role', User::ROLE_MEMBER)
            ->where('platform_tier', 'premium')
            ->where(function($q) {
                $q->whereNull('platform_upgrade_expires_at')
                  ->orWhere('platform_upgrade_expires_at', '>', now());
            })->count();

        // MRR (Predictive Platform Revenue) - SYNCED with AdminController
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

        // Recent Churn
        $thirtyDaysAgo = $now->copy()->subDays(30);

        $recentChurn = DB::table('subscribe') 
            ->select('id_gym')
            ->where('status', 'expired') 
            ->where('updated_at', '>=', $thirtyDaysAgo)
            ->whereNotIn('id_gym', function ($sub) {
                $sub->select('id_gym')
                    ->from('subscribe')
                    ->where('status', 'active');
            })
            ->distinct()
            ->count('id_gym');

        $data = [
            'total_active_gyms'    => $totalActiveGyms,
            'total_active_owners'  => $totalActiveOwners,
            'total_members'        => $totalMembers,
            'upgraded_members'     => $upgradedMembers,
            'mrr'                  => round((float) $mrr, 2),
            'recent_churn'         => $recentChurn,
        ];

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
