<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourseRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'id_gym' => 'required|exists:gyms,id_gym',
            'price' => 'required|numeric|min:0',
            'max_capacity' => 'required|integer|min:1',
            'count' => 'required|integer|min:0',
            'duration' => 'required|string|max:255',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Course name is required',
            'description.required' => 'Course description is required',
            'id_gym.required' => 'Gym is required',
            'id_gym.exists' => 'Selected gym does not exist',
            'price.required' => 'Course price is required',
            'price.numeric' => 'Price must be a number',
            'max_capacity.required' => 'Maximum capacity is required',
            'max_capacity.integer' => 'Capacity must be a whole number',
            'count.required' => 'Course count is required',
            'count.integer' => 'Count must be a whole number',
            'duration.required' => 'Course duration is required',
        ];
    }
}
