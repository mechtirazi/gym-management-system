<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
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
            'id_gym'   => 'nullable|string|exists:gyms,id_gym',
            'name'     => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'price'    => 'required|numeric|min:0',
            'stock'    => 'required|integer|min:0',
            'category' => 'required|in:Supplements,Equipment,Apparel,Accessories,Nutrition',
            'image'    => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Product name is required',
            'price.required' => 'Product price is required',
            'price.numeric' => 'Price must be a number',
            'stock.required' => 'Product stock is required',
            'stock.integer' => 'Stock must be a whole number',
            'category.required' => 'Product category is required',
        ];
    }
}
