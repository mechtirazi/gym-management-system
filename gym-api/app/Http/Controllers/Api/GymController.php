<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreGymRequest;
use App\Http\Requests\UpdateGymRequest;
use Illuminate\Http\Request;
use App\Models\Gym;
use App\Services\GymService;

class GymController extends BaseApiController
{
    public function __construct(GymService $gymService)
    {
        $this->configureBase(
            $gymService,
            'gym',
            StoreGymRequest::class,
            UpdateGymRequest::class
        );
    }

    protected function getModelClass()
    {
        return Gym::class;
    }

    public function getMembershipPlans(Gym $gym)
    {
        $plans = $gym->membershipPlans;
        
        // If no plans exist, return the default ones we had before as a fallback
        // or just return the empty collection. Let's return the collection.
        return response()->json([
            'success' => true,
            'data' => $plans
        ]);
    }

    public function update(Request $request, $id)
    {
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('gym_logos', 'public');
            // Adding it to request so the parent BaseApiController validation includes it
            $request->merge(['picture' => '/storage/' . $path]);
        }
        return parent::update($request, $id);
    }

}
