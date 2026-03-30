<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreSessionRequest;
use App\Http\Requests\UpdateSessionRequest;
use App\Models\Session;
use App\Services\SessionService;

class SessionController extends BaseApiController
{
    public function __construct(SessionService $sessionService)
    {
        $this->configureBase(
            $sessionService,
            'session',
            StoreSessionRequest::class,
            UpdateSessionRequest::class
        );
    }

    protected function getModelClass()
    {
        return Session::class;
    }
}
