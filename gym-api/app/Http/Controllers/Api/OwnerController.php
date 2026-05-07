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

    /**
     * Renew the platform subscription for a gym.
     */
    public function renewSubscription(Request $request, Gym $gym)
    {
        // 1. Authorization
        if ($request->user()->id_user !== $gym->id_owner && $request->user()->role !== 'super_admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized access.'], 403);
        }

        $type = $request->input('type', 'monthly'); // monthly, semester, yearly
        $method = $request->input('payment_method', 'zen_wallet');

        // 2. Pricing Logic (Standard platform prices)
        $prices = [
            'monthly' => 49.99,
            'semester' => 239.94,
            'semestrial' => 239.94,
            'yearly' => 359.88
        ];

        $price = $prices[$type] ?? 49.99;

        // 3. Payment Processing (Placeholder for actual gateway logic)
        // If zen_wallet, we would deduct from owner's platform wallet here.
        // For now, we simulate success for the demo flow.

        // 4. Update Gym Status
        $now = now();
        $newExpiry = match ($type) {
            'semester', 'semestrial' => $now->addMonths(6),
            'yearly' => $now->addYear(),
            default => $now->addMonth(),
        };

        $gym->update([
            'platform_subscription_type' => $type,
            'platform_subscription_price' => $price,
            'subscription_expires_at' => $newExpiry,
            'status' => 'active',
            'is_payment_pending' => false,
            'last_payment_date' => $now
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Gym subscription renewed successfully for the ' . $type . ' tier.',
            'data' => [
                'subscription_expires_at' => $newExpiry,
                'status' => $gym->status
            ]
        ]);
    }
}
