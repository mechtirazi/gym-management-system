<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreSubscribeRequest;
use App\Http\Requests\UpdateSubscribeRequest;
use App\Models\Subscribe;
use App\Services\SubscribeService;

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

    protected function getModelClass()
    {
        return Subscribe::class;
    }
}
