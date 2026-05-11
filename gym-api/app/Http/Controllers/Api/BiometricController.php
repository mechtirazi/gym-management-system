<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BiometricLog;
use Illuminate\Http\Request;

class BiometricController extends Controller
{
    public function index(Request $request)
    {
        $memberId = $request->query('memberId');
        
        if (!$memberId) {
            return response()->json(['success' => false, 'message' => 'Member ID required'], 400);
        }

        try {
            $logs = BiometricLog::where('id_member', $memberId)
                ->orderBy('log_date', 'desc')
                ->get();

            // If no logs found, inject current user status as a baseline
            if ($logs->isEmpty()) {
                $user = \App\Models\User::find($memberId);
                if ($user && ($user->manual_weight || $user->manual_calories)) {
                    $baseline = new BiometricLog([
                        'id_member' => $user->id_user,
                        'weight' => $user->manual_weight,
                        'calories' => $user->manual_calories,
                        'log_date' => now()->toDateString(),
                        'notes' => 'Current Live Baseline'
                    ]);
                    $logs = collect([$baseline]);
                }
            }

            return response()->json([
                'success' => true,
                'data' => $logs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false, 
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'id_member' => 'required',
            'weight' => 'required|numeric',
            'body_fat' => 'nullable|numeric',
            'log_date' => 'required|date'
        ]);

        try {
            $log = BiometricLog::create($request->all());

            return response()->json([
                'success' => true,
                'data' => $log
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false, 
                'message' => 'Failed to save biometric data: ' . $e->getMessage()
            ], 500);
        }
    }
    public function getWorkouts(Request $request)
    {
        $memberId = $request->query('memberId');
        
        if (!$memberId) {
            return response()->json(['success' => false, 'message' => 'Member ID required'], 400);
        }

        try {
            $history = \App\Models\WorkoutLog::where('id_member', $memberId)
                ->with(['exercises.sets'])
                ->orderBy('workout_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $history
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false, 
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }
}
