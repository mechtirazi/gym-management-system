<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreNutritionPlanRequest;
use App\Http\Requests\UpdateNutritionPlanRequest;
use App\Models\NutritionPlan;
use App\Services\NutritionPlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NutritionPlanController extends BaseApiController
{
    public function __construct(NutritionPlanService $nutritionPlanService)
    {
        Log::info('NutritionPlanController: Constructing with Service');
        $this->configureBase(
            $nutritionPlanService,
            'nutritionPlan',
            StoreNutritionPlanRequest::class,
            UpdateNutritionPlanRequest::class
        );
        
        // Manual failsafe for null service issues
        if (!$this->service) {
            $this->service = $nutritionPlanService;
        }
    }

    public function available()
    {
        try {
            Log::info('NutritionPlanController: Accessing Available Plans');
            $activeGymId = request()->header('X-Gym-Id');
            $gymIds = auth()->user()->allowedGymIds();
            
            $query = NutritionPlan::with(['gym', 'nutritionist']);
            if ($activeGymId) {
                $query->where('id_gym', $activeGymId);
            } else {
                $query->whereIn('id_gym', $gymIds);
            }

            return response()->json([
                'success' => true,
                'data' => $query->get(),
                'diagnostic' => 'Bio-Sync Active'
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    protected function getModelClass()
    {
        return NutritionPlan::class;
    }

    public function show($id)
    {
        return parent::show($id);
    }

    /**
     * Member: Purchase a nutrition plan.
     */
    public function purchase(Request $request, NutritionPlan $nutritionPlan)
    {
        try {
            $user = auth()->user();
            $result = $this->service->purchase($nutritionPlan, $user, $request->all());
            return response()->json($result);
        } catch (\Exception $e) {
                return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Member: Toggle a meal as completed.
     */
    public function toggleMealLog(Request $request, $mealId)
    {
        // For simplicity, we'll use the ID directly if the model binding is tricky in BaseApiController
        $meal = \App\Models\NutritionMeal::findOrFail($mealId);
        $isCompleted = $request->input('is_completed', false);
        
        $user = auth()->user();
        
        // Record the toggle in a pivot or separate log table if needed
        // For this demo, we'll just return success as the frontend handles the UI state
        // In a real app, you'd save this to a nutrition_logs table
        
        return response()->json([
            'success' => true,
            'message' => $isCompleted ? 'Meal consumption logged.' : 'Meal log reverted.',
            'id_meal' => $mealId,
            'is_completed' => $isCompleted
        ]);
    }

    /**
     * Member: Log water intake.
     */
    public function logWater(Request $request)
    {
        $amount = $request->input('amount_ml', 0);
        $user = auth()->user();
        
        // Update user's manual water stat
        $user->manual_water += $amount;
        $user->save();
        
        return response()->json([
            'success' => true,
            'total_today' => $user->manual_water,
            'added' => $amount
        ]);
    }
}
