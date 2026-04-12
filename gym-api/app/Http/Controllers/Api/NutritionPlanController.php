<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreNutritionPlanRequest;
use App\Http\Requests\UpdateNutritionPlanRequest;
use App\Models\NutritionPlan;
use App\Services\NutritionPlanService;

class NutritionPlanController extends BaseApiController
{
    public function __construct(NutritionPlanService $nutritionPlanService)
    {
        $this->configureBase(
            $nutritionPlanService,
            'nutritionPlan',
            StoreNutritionPlanRequest::class,
            UpdateNutritionPlanRequest::class
        );
    }

    protected function getModelClass()
    {
        return NutritionPlan::class;
    }

    /**
     * Get all available nutrition plans for members (Marketplace)
     */
    public function available()
    {
        // Return all plans but calculate the active status dynamically
        $now = now();
        $plans = NutritionPlan::with(['gym', 'nutritionist'])->get();
        
        $plans->each(function ($plan) use ($now) {
            $plan->is_active = ($plan->start_date <= $now && $plan->end_date >= $now);
        });
            
        return response()->json([
            'success' => true,
            'data' => $plans
        ]);
    }

    /**
     * Purchase (enroll in) a nutrition hub plan
     */
    public function purchase(NutritionPlan $nutritionPlan)
    {
        $user = auth()->user();
        
        // Use the members relationship to sync the user
        $nutritionPlan->members()->syncWithoutDetaching([$user->id_user]);
        
        return response()->json([
            'success' => true,
            'message' => 'Plan successfully synchronized with your bio-hub.'
        ]);
    }
}
