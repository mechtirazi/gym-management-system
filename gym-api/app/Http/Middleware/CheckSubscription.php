<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role === 'owner') {
            // If the route has a gym ID, check that specific gym
            $gymId = $request->route('id_gym') ?: $request->route('gym') ?: $request->route('id');
            
            if ($gymId) {
                $gym = \App\Models\Gym::find($gymId);
                if ($gym && $gym->subscription_expires_at && $gym->subscription_expires_at->isPast()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Subscription expired for this gym. Payment required.',
                        'code' => 'PAYMENT_REQUIRED'
                    ], 402);
                }
            } else {
                // For general owner routes, check if they have at least one active gym
                $hasActiveGym = $user->ownedGyms()
                    ->where(function($query) {
                        $query->whereNull('subscription_expires_at')
                              ->orWhere('subscription_expires_at', '>', now());
                    })->exists();

                if (!$hasActiveGym && $user->ownedGyms()->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'All your gym subscriptions have expired. Payment required.',
                        'code' => 'PAYMENT_REQUIRED'
                    ], 402);
                }
            }
        }

        return $next($request);
    }
}
