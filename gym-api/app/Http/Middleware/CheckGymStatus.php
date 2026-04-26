<?php

namespace App\Http\Middleware;

use App\Models\Gym;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckGymStatus
{
    /**
     * Block API access when any gym associated with the user is suspended.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Super admins are never blocked by gym status
        if (! $user instanceof User || $user->role === User::ROLE_SUPER_ADMIN) {
            return $next($request);
        }

        // Whitelist of "Safe" routes that should never be blocked by gym status
        // These are essential for navigating out of a suspended state.
        $safeRoutes = [
            'api/gyms',             // Listing gyms for switching
            'api/auth/refresh',     // Token management
            'api/auth/logout',      // Exit
            'api/owner/dashboard-stats', // Allow dashboard shell
            'api/owner/revenue-stats',   // Allow revenue overview
            'api/owner/recent-checkins', // Meta dashboards
            'api/notifications',    // Platform communication
            'api/gym-staff/invitations', // Allow viewing invitations
            'api/gym-staff/join',        // Allow accepting invitations
            'api/gym-staff/decline',     // Allow declining invitations
        ];

        foreach ($safeRoutes as $safeRoute) {
            if ($request->is($safeRoute) || $request->is($safeRoute . '/*')) {
                return $next($request);
            }
        }

        // Get the specific gym context from the header
        $gymId = $request->header('X-Gym-Id');

        if ($gymId) {
            // If a specific gym is requested, check only that gym's status
            $gym = Gym::where('id_gym', $gymId)->first();
            if ($gym && $gym->status === 'suspended') {
                // ALLOW GET requests for the gym profile itself 
                // so the owner can see the suspension banner and rationale.
                if ($request->isMethod('GET') && ($request->is('api/gyms/*') || $request->is('api/owner/gyms/*'))) {
                    return $next($request);
                }

                return response()->json([
                    'success' => false,
                    'message' => "This gym's access has been suspended. Please contact the platform administrator.",
                    'reason' => $gym->suspension_reason
                ], 403);
            }
        } else {
            // If no specific gym is requested (e.g. global dashboard)
            // Members are usually tied to one gym context, so we check if they have any active gyms
            if ($user->role === User::ROLE_MEMBER) {
                $ids = $user->allowedGymIds();
                $hasActive = Gym::whereIn('id_gym', $ids)->where('status', 'active')->exists();
                
                if (!$hasActive && !$ids->isEmpty()) {
                    return response()->json([
                        'success' => false,
                        'message' => "Your gym's access has been suspended.",
                    ], 403);
                }
            }
            // Owners/Staff with no header are allowed through to see their list of gyms
        }

        return $next($request);
    }
}
