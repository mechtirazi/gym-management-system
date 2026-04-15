<?php

namespace App\Http\Controllers\Api;

use App\Models\MembershipPlan;
use App\Models\Gym;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OwnerMembershipPlanController extends BaseApiController
{
    /**
     * Display a listing of membership plans for a specific gym.
     */
    public function index(Gym $gym)
    {
        // Security: Ensure the user owns this gym
        if ($gym->id_owner !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access to this hub.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $gym->membershipPlans
        ]);
    }

    /**
     * Store a newly created membership plan.
     */
    public function store(Request $request, Gym $gym)
    {
        if ($gym->id_owner !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'duration_days' => 'required|integer|min:1',
            'description' => 'nullable|string',
            'type' => 'required|string|in:trial,standard,premium'
        ]);

        $plan = $gym->membershipPlans()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'New synchronization tier established.',
            'data' => $plan
        ]);
    }

    /**
     * Update the specified membership plan.
     */
    public function update(Request $request, MembershipPlan $plan)
    {
        $gym = $plan->gym;
        if ($gym->id_owner !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'duration_days' => 'sometimes|integer|min:1',
            'description' => 'nullable|string',
            'type' => 'sometimes|string|in:trial,standard,premium'
        ]);

        $plan->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Synchronization tier updated.',
            'data' => $plan
        ]);
    }

    /**
     * Remove the specified membership plan.
     */
    public function destroy(MembershipPlan $plan)
    {
        $gym = $plan->gym;
        if ($gym->id_owner !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access.'], 403);
        }

        $plan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Synchronization tier decommissioned.'
        ]);
    }

    protected function getModelClass()
    {
        return MembershipPlan::class;
    }
}
