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

        if (! $user instanceof User || $user->role === User::ROLE_SUPER_ADMIN) {
            return $next($request);
        }

        $ids = $user->allowedGymIds(); // Use allowedGymIds for compatibility

        if (!$ids || $ids->isEmpty()) {
            return $next($request);
        }

        $hasSuspended = Gym::query()
            ->whereIn('id_gym', $ids)
            ->where('status', 'suspended')
            ->exists();

        if ($hasSuspended) {
            return response()->json([
                'success' => false,
                'message' => "Your gym's access has been suspended. Please contact the platform administrator.",
            ], 403);
        }

        return $next($request);
    }
}
