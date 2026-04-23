<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'id_user' => 'sometimes|exists:users,id_user',
            'id_gym' => 'sometimes|exists:gyms,id_gym',
            'amount' => 'sometimes|numeric|min:0',
            'method' => 'sometimes|string',
            'id_transaction' => 'sometimes|unique:payments,id_transaction,'.$this->route('payment')->id_payment.',id_payment',
        ];
    }

    public function messages(): array
    {
        return [
            'id_user.exists' => 'User not found',
            'id_gym.exists' => 'Gym not found',
            'amount.numeric' => 'Amount must be a number',
            'amount.min' => 'Amount must be at least 0',
            'id_transaction.unique' => 'Transaction ID must be unique',
        ];
    }
}
