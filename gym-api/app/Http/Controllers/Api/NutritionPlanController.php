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
            return response()->json([
                'success' => true,
                'data' => NutritionPlan::all(),
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
}
