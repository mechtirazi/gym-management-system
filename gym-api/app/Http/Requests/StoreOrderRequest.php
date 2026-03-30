<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
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
            'order_date' => 'required|date',
            'status' => 'required|in:pending,confirmed,completed,cancelled',
            'total_amount' => 'nullable|numeric|min:0',
            'id_member' => 'required|exists:users,id_user',
            'products' => 'nullable|array',
            'products.*.id_product' => 'required_with:products|exists:products,id_product',
            'products.*.quantity' => 'required_with:products|integer|min:1',
            'products.*.price' => 'nullable|numeric|min:0',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'order_date.required' => 'Order date is required',
            'order_date.date' => 'Order date must be a valid date',
            'status.required' => 'Order status is required',
            'status.in' => 'Status must be one of: pending, confirmed, completed, cancelled',
            'total_amount.numeric' => 'Total amount must be a number',
            'total_amount.min' => 'Total amount must be at least 0',
            'id_member.required' => 'Member is required',
            'id_member.exists' => 'Selected member does not exist',
        ];
    }
}
