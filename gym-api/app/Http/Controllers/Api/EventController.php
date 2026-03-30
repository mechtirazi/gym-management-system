<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Models\Event;
use App\Services\EventService;
use Illuminate\Http\Request;

class EventController extends BaseApiController
{
    public function __construct(EventService $eventService)
    {
        $this->configureBase(
            $eventService,
            'event',
            StoreEventRequest::class ,
            UpdateEventRequest::class
        );
    }

    protected function getModelClass()
    {
        return Event::class;
    }

}
