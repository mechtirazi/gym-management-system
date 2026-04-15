<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreSubscribeRequest;
use App\Http\Requests\UpdateSubscribeRequest;
use App\Models\Subscribe;
use App\Services\SubscribeService;

use App\Http\Resources\SubscribeResource;

class SubscribeController extends BaseApiController
{
    public function __construct(SubscribeService $subscribeService)
    {
        $this->configureBase(
            $subscribeService,
            'subscribe',
            StoreSubscribeRequest::class,
            UpdateSubscribeRequest::class
        );
    }

    public function index(\Illuminate\Http\Request $request)
    {
        try {
            $user = auth()->user();
            $data = $this->service->getAllScoped($user);
            
            return response()->json([
                'success' => true,
                'data' => SubscribeResource::collection($data),
                'message' => 'Subscriptions retrieved successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving subscriptions: ' . $e->getMessage(),
            ], 500);
        }
    }

    protected function getModelClass()
    {
        return Subscribe::class;
    }
}
