<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Services\CourseService;
use Illuminate\Http\Request;
use App\Models\Session;
use App\Models\Enrollment;
use App\Models\Attendance;
use Carbon\Carbon;

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
                $uploaded = $request->file('image')->storeOnCloudinary('courses');
                $validatedData['image'] = $uploaded->getSecurePath();
            }

            $course = $this->service->create($validatedData);

            // Handle Recurring Sessions
            if ($request->boolean('is_recurring') && $request->has('recurring_days')) {
                $this->generateRecurringSessions($course, $validatedData);
            }

            return response()->json([
                'success' => true,
                'data' => $course,
                'message' => 'Course created successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating course: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function generateRecurringSessions($course, $data)
    {
        $days = $data['recurring_days'] ?? [];
        $startTime = $data['recurring_start_time'] ?? '10:00';
        $endTime = $data['recurring_end_time'] ?? '11:00';
        $weeks = $data['recurrence_weeks'] ?? 4;
        $trainerId = $data['id_trainer'] ?? null;
        if ($trainerId === '')
            $trainerId = null;

        for ($i = 0; $i < $weeks; $i++) {
            foreach ($days as $dayName) {
                // Standardize day name for Carbon
                $date = Carbon::parse("this $dayName")->addWeeks($i);

                // Skip if date is in the past
                if ($date->isPast())
                    continue;

                $session = Session::create([
                    'id_course' => $course->id_course,
                    'id_trainer' => $trainerId,
                    'date_session' => $date->toDateString(),
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'status' => 'upcoming',
                    'max_capacity' => $course->max_capacity,
                    'is_weekly' => true,
                ]);

                // BIO-SYNC: Automatically reserve all members who have an active "Full Pass" for this course
                $subscribers = Enrollment::where('id_course', $course->id_course)
                    ->where('type', 'subscription')
                    ->where('status', 'active')
                    ->pluck('id_member');

                foreach ($subscribers as $memberId) {
                    Attendance::firstOrCreate([
                        'id_member' => $memberId,
                        'id_session' => $session->id_session
                    ], [
                        'status' => 'pending'
                    ]);
                }
            }
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
                $uploaded = $request->file('image')->storeOnCloudinary('courses');
                $validatedData['image'] = $uploaded->getSecurePath();
            }

            $data = $this->service->update($model, $validatedData);

            // Handle Recurring Sessions on Update
            if ($request->boolean('is_recurring') && $request->has('recurring_days')) {
                $this->generateRecurringSessions($data, $validatedData);
            }

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
