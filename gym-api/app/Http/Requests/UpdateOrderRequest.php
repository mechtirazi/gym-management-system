<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrderRequest extends FormRequest
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
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'order_date' => 'sometimes|date',
            'status' => 'sometimes|in:pending,confirmed,completed,cancelled',
            'total_amount' => 'sometimes|numeric|min:0',
            'id_member' => 'sometimes|exists:users,id_user',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'order_date.date' => 'Order date must be a valid date',
            'status.in' => 'Status must be one of: pending, confirmed, completed, cancelled',
            'total_amount.numeric' => 'Total amount must be a number',
            'total_amount.min' => 'Total amount must be at least 0',
            'id_member.exists' => 'Selected member does not exist',
        ];
    }
}
