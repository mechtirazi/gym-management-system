<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class OwnerController extends Controller
{
    /**
     * Upload a subscription payment receipt for a gym.
     */
    public function uploadReceipt(Request $request, Gym $gym)
    {
        // 1. Validation
        $validator = Validator::make($request->all(), [
            'receipt' => 'required|image|mimes:jpeg,png,jpg|max:2048', // 2MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // 2. Authorization check (ensure current user owns the gym)
        if ($request->user()->id_user !== $gym->id_owner && $request->user()->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: You do not own this gym.'
            ], 403);
        }

        // 3. Handle Storage
        try {
            // Delete old receipt if exists
            if ($gym->last_receipt_image) {
                Storage::disk('public')->delete($gym->last_receipt_image);
            }

            $path = $request->file('receipt')->store('receipts', 'public');

            // 4. Update Database
            $gym->update([
                'last_receipt_image' => $path,
                'is_payment_pending' => true,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'gym_id' => $gym->id_gym,
                    'receipt_url' => Storage::disk('public')->url($path),
                    'is_payment_pending' => $gym->is_payment_pending
                ],
                'message' => 'Receipt uploaded successfully. Awaiting manual verification.'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload receipt: ' . $e->getMessage()
            ], 500);
        }
    }
}
