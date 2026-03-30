<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourseRequest extends FormRequest
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
            'description' => 'sometimes|string',
            'id_gym' => 'sometimes|exists:gyms,id_gym',
            'price' => 'sometimes|numeric|min:0',
            'max_capacity' => 'sometimes|integer|min:1',
            'count' => 'sometimes|integer|min:0',
            'duration' => 'sometimes|string|max:255',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'id_gym.exists' => 'Selected gym does not exist',
            'price.numeric' => 'Price must be a number',
            'max_capacity.integer' => 'Capacity must be a whole number',
            'count.integer' => 'Count must be a whole number',
        ];
    }
}
