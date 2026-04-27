<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
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
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'stock' => 'sometimes|integer|min:0',
            'category' => 'sometimes|in:Supplements,Equipment,Apparel,Accessories,Nutrition',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'price.numeric' => 'Price must be a number',
            'stock.integer' => 'Stock must be a whole number',
        ];
    }
}
