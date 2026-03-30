<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreGymRequest;
use App\Http\Requests\UpdateGymRequest;
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
}
