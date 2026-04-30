<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Strict Allowed Payload
            'amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'member_id' => 'nullable|exists:users,id_user',
            'category' => 'required|string|in:membership,product,course,nutrition,other',
            'gateway' => 'required|string',
            'external_reference' => 'nullable|string|max:255',
            'id_gym' => 'required|exists:gyms,id_gym', // Required to attach to a gym in the current architecture

            // Explicitly Rejected System Fields
            'status' => 'prohibited',
            'is_locked' => 'prohibited',
            'public_id' => 'prohibited',
            'sequence' => 'prohibited',
            'id_payment' => 'prohibited',
            'created_by' => 'prohibited',
            'finalized_by' => 'prohibited',
            'amount_formatted' => 'prohibited',
            'date_formatted' => 'prohibited',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'Amount is required',
            'amount.numeric' => 'Amount must be a number',
            'amount.min' => 'Amount must be at least 0',
            'category.required' => 'Transaction category is required',
            'gateway.required' => 'Payment gateway is required',
            'status.prohibited' => 'System field [status] cannot be set manually',
            'is_locked.prohibited' => 'System field [is_locked] cannot be set manually',
            'public_id.prohibited' => 'System field [public_id] cannot be set manually',
            'sequence.prohibited' => 'System field [sequence] cannot be set manually',
        ];
    }
}
