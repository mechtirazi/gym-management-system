<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Services\CourseService;
use Illuminate\Http\Request;

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

    public function store(Request $request)
    {
        try {
            $this->authorize('create', Course::class);
            $validatedData = app(StoreCourseRequest::class)->validated();

            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('courses', 'public');
                $validatedData['image'] = '/storage/' . $path;
            }

            $data = $this->service->create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Course created successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating course: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $model = $this->findModel($id);
            if (!$model)
                $model = $this->service->getById($id);

            if ($model) {
                $this->authorize('update', $model);
            }

            $validatedData = app(UpdateCourseRequest::class)->validated();

            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('courses', 'public');
                $validatedData['image'] = '/storage/' . $path;
            }

            $data = $this->service->update($model, $validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Course updated successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating course: ' . $e->getMessage(),
            ], 500);
        }
    }

    protected function getModelClass()
    {
        return Course::class;
    }
}
