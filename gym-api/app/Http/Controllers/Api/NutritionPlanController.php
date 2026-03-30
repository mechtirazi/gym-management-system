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
}
