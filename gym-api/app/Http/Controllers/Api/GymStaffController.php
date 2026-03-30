<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreGymStaffRequest;
use App\Http\Requests\UpdateGymStaffRequest;
use App\Models\GymStaff;
use App\Services\GymStaffService;

class GymStaffController extends BaseApiController
{
    public function __construct(GymStaffService $gymStaffService)
    {
        $this->configureBase(
            $gymStaffService,
            'gym staff',
            StoreGymStaffRequest::class,
            UpdateGymStaffRequest::class
        );
    }

    protected function getModelClass()
    {
        return GymStaff::class;
    }
}
