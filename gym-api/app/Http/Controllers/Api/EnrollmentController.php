<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreEnrollmentRequest;
use App\Http\Requests\UpdateEnrollmentRequest;
use App\Models\Enrollment;
use App\Services\EnrollmentService;

class EnrollmentController extends BaseApiController
{
    public function __construct(EnrollmentService $enrollmentService)
    {
        $this->configureBase(
            $enrollmentService,
            'enrollment',
            StoreEnrollmentRequest::class ,
            UpdateEnrollmentRequest::class
        );
    }

    protected function getModelClass()
    {
        return Enrollment::class;
    }

}
