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
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
            'id_gym' => ['sometimes', 'exists:gyms,id_gym'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'max_capacity' => ['sometimes', 'integer', 'min:1'],
            'count' => ['sometimes', 'integer', 'min:0'],
            'duration' => ['sometimes', 'integer', 'min:1'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048'],
            'is_subscription_enabled' => ['nullable', 'boolean'],
            'subscription_price' => ['nullable', 'numeric', 'min:0'],
            'is_recurring' => ['nullable', 'boolean'],
            'recurring_days' => ['nullable', 'array'],
            'recurring_start_time' => ['nullable', 'regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'recurring_end_time' => ['nullable', 'regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'recurrence_weeks' => ['nullable', 'integer', 'min:0'],
            'id_trainer' => ['nullable', 'exists:users,id_user'],
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
