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
        $withSummary = filter_var($request->input('with_summary', '1'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        $withSummary = $withSummary !== false;
        $data = $this->service->getAllScoped(auth()->user(), $perPage);

        $resource = \App\Http\Resources\PaymentResource::collection($data);
        
        $response = $resource->response()->getData();
        $response->success = true;
        $response->message = 'Payments retrieved successfully';
        if ($withSummary) {
            $response->financial_summary = $this->service->getFinancialSummary(auth()->user());
        }

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
     * Finalize a pending payment (e.g., when a product is delivered)
     */
    public function finalize($id)
    {
        $payment = $this->findModel($id) ?? $this->service->getById($id);
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        $this->authorize('update', $payment);

        try {
            $payment = $this->service->finalizePayment($payment, auth()->id());
            return response()->json([
                'success' => true,
                'data' => new \App\Http\Resources\PaymentResource($payment),
                'message' => 'Payment finalized successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Override update to prevent modifying payments except finalization
     */
    public function update(\Illuminate\Http\Request $request, $id)
    {
        return response()->json([
            'success' => false,
            'message' => 'Payments are immutable. Use the [finalize] endpoint to complete pending transactions.'
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
