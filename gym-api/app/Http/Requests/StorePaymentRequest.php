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
            'id_user' => 'required|exists:users,id_user',
            'amount' => 'required|numeric|min:0',
            'method' => 'required|string',
            'type' => 'nullable|string|in:membership,product,course,nutrition,other',
            'id_transaction' => 'required|unique:payments,id_transaction',
        ];
    }

    public function messages(): array
    {
        return [
            'id_user.required' => 'User ID is required',
            'id_user.exists' => 'User not found',
            'amount.required' => 'Amount is required',
            'amount.numeric' => 'Amount must be a number',
            'amount.min' => 'Amount must be at least 0',
            'method.required' => 'Payment method is required',
            'type.in' => 'Invalid payment type',
            'id_transaction.required' => 'Transaction ID is required',
            'id_transaction.unique' => 'Transaction ID must be unique',
        ];
    }
}
