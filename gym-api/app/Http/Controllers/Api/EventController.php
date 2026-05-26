<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Models\Event;
use App\Services\EventService;
use App\Traits\UploadsToCloudinary;
use Illuminate\Http\Request;

class EventController extends BaseApiController
{
    use UploadsToCloudinary;
    public function __construct(EventService $eventService)
    {
        $this->configureBase(
            $eventService,
            'event',
            StoreEventRequest::class,
            UpdateEventRequest::class
        );
    }

    public function store(Request $request)
    {
        try {
            $this->authorize('create', Event::class);
            $validatedData = app(StoreEventRequest::class)->validated();

            if ($request->hasFile('image')) {
                $validatedData['image'] = $this->uploadToCloudinary($request->file('image'), 'events');
            }

            $data = $this->service->create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Event created successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating event: ' . $e->getMessage(),
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

            $validatedData = app(UpdateEventRequest::class)->validated();

            if ($request->hasFile('image')) {
                $validatedData['image'] = $this->uploadToCloudinary($request->file('image'), 'events');
            }

            $data = $this->service->update($model, $validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Event updated successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating event: ' . $e->getMessage(),
            ], 500);
        }
    }

    protected function getModelClass()
    {
        return Event::class;
    }
}
