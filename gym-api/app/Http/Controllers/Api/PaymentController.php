<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\UpdatePaymentRequest;
use App\Models\Payment;
use App\Services\PaymentService;

class PaymentController extends BaseApiController
{
    public function __construct(PaymentService $paymentService)
    {
        $this->configureBase(
            $paymentService,
            'payment',
            StorePaymentRequest::class,
            UpdatePaymentRequest::class
        );
    }

    protected function getModelClass()
    {
        return Payment::class;
    }

    public function index(\Illuminate\Http\Request $request)
    {
        $response = parent::index($request);
        $data = $response->getData();
        
        if ($data->success) {
            $data->todays_total = $this->service->getTodaysTotal(auth()->user());
            $response->setData($data);
        }
        
        return $response;
    }
}
