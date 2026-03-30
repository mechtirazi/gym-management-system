<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Services\CourseService;

class CourseController extends BaseApiController
{
    public function __construct(CourseService $courseService)
    {
        $this->configureBase(
            $courseService,
            'course',
            StoreCourseRequest::class,
            UpdateCourseRequest::class
        );
    }

    protected function getModelClass()
    {
        return Course::class;
    }
}
