<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

abstract class BaseApiController extends Controller
{
    use AuthorizesRequests;

    /**
     * The service instance used for business logic
     */
    protected $service;

    /**
     * The model name for messages and method calls (e.g., 'Attendance', 'User')
     */
    protected $modelName;

    /**
     * The request class for storing (e.g., StoreAttendanceRequest)
     */
    protected $storeRequest;

    /**
     * The request class for updating (e.g., UpdateAttendanceRequest)
     */
    protected $updateRequest;

    /**
     * Configure the base controller with service and model information
     * This must be called in child controller's constructor
     */
    protected function configureBase($service, $modelName, $storeRequest = null, $updateRequest = null)
    {
        $this->service = $service;
        $this->modelName = $modelName;
        $this->storeRequest = $storeRequest;
        $this->updateRequest = $updateRequest;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            // Check authorization to view any
            $modelClass = $this->getModelClass();
            if ($modelClass) {
                $this->authorize('viewAny', $modelClass);
            }

            $perPage = $request->input('per_page') ? (int) $request->input('per_page') : null;
            $data = $this->service->getAllScoped(auth()->user(), $perPage);

            if ($perPage && !($data instanceof \Illuminate\Contracts\Pagination\LengthAwarePaginator)) {
                $page = (int) $request->input('page', 1);
                $paginatedItems = $data->slice(($page - 1) * $perPage, $perPage)->values();
                $data = new \Illuminate\Pagination\LengthAwarePaginator(
                    $paginatedItems, 
                    $data->count(), 
                    $perPage, 
                    $page,
                    ['path' => $request->url(), 'query' => $request->query()]
                );
            }

            // If the data is paginated, merge the paginator array (which contains 'data', 'current_page', etc.)
            if ($data instanceof \Illuminate\Contracts\Pagination\LengthAwarePaginator) {
                /** @var \Illuminate\Pagination\LengthAwarePaginator $data */
                return response()->json(array_merge([
                    'success' => true,
                    'message' => ucfirst($this->modelName) . ' retrieved successfully',
                ], $data->toArray()), 200);
            }

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' retrieved successfully',
            ], 200);
        }
        catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ' . $this->modelName . ': ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            // Check authorization
            $modelClass = $this->getModelClass();
            if ($modelClass) {
                $this->authorize('create', $modelClass);
            }

            // If store request class is defined, validate using it
            if ($this->storeRequest) {
                $validatedData = app($this->storeRequest)->validated();
            }
            else {
                $validatedData = $request->all();
            }

            $data = $this->service->create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' created successfully',
            ], 201);
        }
        catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating ' . $this->modelName . ': ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get the model class for this controller (e.g., 'App\Models\Attendance')
     * Override this in child controller if needed
     */
    protected function getModelClass()
    {
        return null; // Can be overridden in child classes
    }

    /**
     * Get model by ID
     */
    protected function findModel($id)
    {
        $modelClass = $this->getModelClass();
        if ($modelClass) {
            return $modelClass::findOrFail($id);
        }

        return null;
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $model = $this->findModel($id);
            if (!$model) {
                $model = $this->service->getById($id);
            }

            // Check authorization
            if ($model) {
                $this->authorize('view', $model);
            }

            $data = $this->service->getById($id);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' retrieved successfully',
            ], 200);
        }
        catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ' . $this->modelName . ': ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            $model = $this->findModel($id);
            if (!$model) {
                // If model not found, try to get it via service
                $model = $this->service->getById($id);
            }

            // Check authorization
            if ($model) {
                $this->authorize('update', $model);
            }

            // If update request class is defined, validate using it
            if ($this->updateRequest) {
                $validatedData = app($this->updateRequest)->validated();
            }
            else {
                $validatedData = $request->all();
            }

            $data = $this->service->update($model, $validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' updated successfully',
            ], 200);
        }
        catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating ' . $this->modelName . ': ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $model = $this->findModel($id);

            if (!$model) {
                // If model not found, try to get it via service
                $model = $this->service->getById($id);
            }

            // Check authorization
            if ($model) {
                $this->authorize('delete', $model);
            }

            $this->service->delete($model);

            return response()->json([
                'success' => true,
                'message' => ucfirst($this->modelName) . ' deleted successfully',
            ], 204);
        }
        catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting ' . $this->modelName . ': ' . $e->getMessage(),
            ], 500);
        }
    }
}
