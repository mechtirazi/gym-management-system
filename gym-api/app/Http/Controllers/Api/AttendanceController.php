<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreAttendanceRequest;
use App\Http\Requests\UpdateAttendanceRequest;
use App\Models\Attendance;
use App\Services\AttendanceService;

class AttendanceController extends BaseApiController
{
    public function __construct(AttendanceService $attendanceService)
    {
        $this->configureBase(
            $attendanceService,
            'attendance',
            StoreAttendanceRequest::class,
            UpdateAttendanceRequest::class
        );
    }

    public function index(\Illuminate\Http\Request $request)
    {
        $sessionId = $request->query('id_session');
        
        try {
            if ($sessionId) {
                $data = $this->service->getAttendancesBySessionId($sessionId);
                return response()->json([
                    'success' => true,
                    'data' => $data,
                    'message' => 'Attendances for session retrieved successfully',
                ], 200);
            }

            return parent::index($request);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving attendance: ' . $e->getMessage(),
            ], 500);
        }
    }

    protected function getModelClass()
    {
        return Attendance::class;
    }
}
