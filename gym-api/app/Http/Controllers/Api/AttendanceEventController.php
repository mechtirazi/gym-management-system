<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreAttendanceEventRequest;
use App\Http\Requests\UpdateAttendanceEventRequest;
use App\Models\AttendanceEvent;
use App\Services\AttendanceEventService;
use Illuminate\Http\Request;
use Illuminate\Auth\Access\AuthorizationException;

class AttendanceEventController extends BaseApiController
{
    public function __construct(AttendanceEventService $attendanceEventService)
    {
        $this->configureBase(
            $attendanceEventService,
            'attendanceEvent',
            StoreAttendanceEventRequest::class,
            UpdateAttendanceEventRequest::class
        );
    }

    protected function getModelClass()
    {
        return AttendanceEvent::class;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $eventId = $request->query('id_event');
        
        try {
            if ($eventId) {
                // For a specific event, we can bypass the full scope if the user owns the gym
                // but for simplicity we'll just use the service method and then filter or scope
                $data = $this->service->getAttendanceEventsByEventId($eventId);
                return response()->json([
                    'success' => true,
                    'data' => $data,
                    'message' => 'Attendances for event retrieved successfully',
                ], 200);
            }

            return parent::index($request);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $this->authorize('create', AttendanceEvent::class);

            $validatedData = $this->storeRequest
                ? app($this->storeRequest)->validated()
                : $request->all();

            // Members can only create their own attendance
            if (auth()->user()->role === \App\Models\User::ROLE_MEMBER) {
                if (empty($validatedData['id_member']) || $validatedData['id_member'] !== auth()->user()->id_user) {
                    throw new AuthorizationException('Members may only create their own attendance');
                }
            }

            $data = $this->service->create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' created successfully'
            ], 201);
        } catch (AuthorizationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: ' . $e->getMessage()
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $model = $this->findModel($id) ?? $this->service->getById($id);

            $this->authorize('view', $model);

            return response()->json([
                'success' => true,
                'data' => $model,
                'message' => ucfirst($this->modelName) . ' retrieved successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            $model = $this->findModel($id) ?? $this->service->getById($id);

            $this->authorize('update', $model);

            $validatedData = $this->updateRequest
                ? app($this->updateRequest)->validated()
                : $request->all();

            // Members can only update their own attendance
            if (auth()->user()->role === \App\Models\User::ROLE_MEMBER) {
                if ($model->id_member !== auth()->user()->id_user) {
                    throw new AuthorizationException('Members may only update their own attendance');
                }
                if (isset($validatedData['id_member']) && $validatedData['id_member'] !== auth()->user()->id_user) {
                    throw new AuthorizationException('Members may not reassign attendance');
                }
            }

            $data = $this->service->update($model, $validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' updated successfully'
            ], 200);
        } catch (AuthorizationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: ' . $e->getMessage()
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $model = $this->findModel($id) ?? $this->service->getById($id);

            $this->authorize('delete', $model);

            $this->service->delete($model);

            return response()->json([
                'success' => true,
                'message' => ucfirst($this->modelName) . ' deleted successfully'
            ], 204);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }
}
