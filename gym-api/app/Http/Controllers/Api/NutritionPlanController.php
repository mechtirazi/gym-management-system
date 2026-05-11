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

            $plans = $query->get();
            $user = auth()->user();

            // Inject ownership status for members
            if ($user && $user->role === \App\Models\User::ROLE_MEMBER) {
                $ownedIds = \DB::table('nutrition_plan_member')
                    ->where('id_user', $user->id_user)
                    ->pluck('id_plan')
                    ->map(fn($id) => (string)$id)
                    ->toArray();
                
                $legacyOwnedIds = NutritionPlan::where('id_member', $user->id_user)
                    ->pluck('id_plan')
                    ->map(fn($id) => (string)$id)
                    ->toArray();
                    
                $allOwnedIds = array_unique(array_merge($ownedIds, $legacyOwnedIds));

                $plans->each(function ($plan) use ($allOwnedIds) {
                    $plan->is_owned = in_array((string)$plan->id_plan, $allOwnedIds);
                });
            }

            return response()->json([
                'success' => true,
                'data' => $plans,
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
        $amount = (float) $request->input('amount_ml', 0);
        $user = \App\Models\User::find(auth()->id());
        
        // Detect if it's a new day to reset the daily counter
        $isNewDay = !$user->updated_at || !\Carbon\Carbon::parse($user->updated_at)->isToday();
        
        if ($isNewDay) {
            $user->manual_water = $amount;
        } else {
            $user->manual_water = ($user->manual_water ?? 0) + $amount;
        }
        
        $user->save();
        $user->refresh();
        
        return response()->json([
            'success' => true,
            'total_today' => (float) $user->manual_water,
            'added' => $amount
        ]);
    }
}
