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
        try {
            $model = $this->findModel($id);
            if (!$model) {
                $model = $this->service->getById($id);
            }

            if (!$model) {
                return response()->json(['success' => false, 'message' => 'Gym not found'], 404);
            }

            if ($model) {
                $this->authorize('update', $model);
            }

            // Get the data to update
            $data = $request->all();

            // Handle image upload
            if ($request->hasFile('logo')) {
                $path = $request->file('logo')->store('gym_logos', 'public');
                $data['picture'] = '/storage/' . $path;
            }

            // Map frontend 'address' to backend 'adress' if provided
            if (isset($data['address'])) {
                $data['adress'] = $data['address'];
            }

            // Update only allowed fields (security)
            $allowedFields = [
                'name', 'email', 'adress', 'phone', 'description', 'picture', 'capacity',
                'open_hour', 'open_mon_fri', 'open_sat', 'open_sun'
            ];
            
            $filteredData = array_intersect_key($data, array_flip($allowedFields));

            $updatedModel = $this->service->update($model, $filteredData);

            return response()->json([
                'success' => true,
                'data' => $updatedModel,
                'message' => 'Gym profile updated successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update gym: ' . $e->getMessage()
            ], 500);
        }
    }

}
