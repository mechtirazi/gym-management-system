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
        $perPage = $request->input('per_page') ? (int) $request->input('per_page') : 10;
        $data = $this->service->getAllScoped(auth()->user(), $perPage);

        $resource = \App\Http\Resources\PaymentResource::collection($data);
        
        $response = $resource->response()->getData();
        $response->success = true;
        $response->message = 'Payments retrieved successfully';
        $response->financial_summary = $this->service->getFinancialSummary(auth()->user());

        return response()->json($response, 200);
    }

    public function show($id)
    {
        $model = $this->findModel($id) ?? $this->service->getById($id);
        
        if ($model) {
            $this->authorize('view', $model);
            return response()->json([
                'success' => true,
                'data' => new \App\Http\Resources\PaymentResource($model),
                'message' => 'Payment retrieved successfully'
            ], 200);
        }
        
        return response()->json(['success' => false, 'message' => 'Not found'], 404);
    }

    public function store(\Illuminate\Http\Request $request)
    {
        $this->authorize('create', $this->getModelClass());

        $validatedData = app($this->storeRequest)->validated();
        
        // Controller is strictly a gateway. Delegate ALL business logic to Service.
        $payment = $this->service->createPayment($validatedData);

        return response()->json([
            'success' => true,
            'data' => new \App\Http\Resources\PaymentResource($payment),
            'message' => 'Payment created and finalized successfully'
        ], 201);
    }

    /**
     * Override update to prevent modifying payments
     */
    public function update(\Illuminate\Http\Request $request, $id)
    {
        return response()->json([
            'success' => false,
            'message' => 'Payments are immutable and cannot be modified once recorded.'
        ], 403);
    }

    /**
     * Override destroy to prevent deleting payments
     */
    public function destroy($id)
    {
        return response()->json([
            'success' => false,
            'message' => 'Payments are immutable and cannot be deleted.'
        ], 403);
    }
}

