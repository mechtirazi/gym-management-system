<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Models\Order;
use App\Services\OrderService;

class OrderController extends BaseApiController
{
    public function __construct(OrderService $orderService)
    {
        $this->configureBase(
            $orderService,
            'order',
            StoreOrderRequest::class,
            UpdateOrderRequest::class
        );
    }

    protected function getModelClass()
    {
        return Order::class;
    }
}
