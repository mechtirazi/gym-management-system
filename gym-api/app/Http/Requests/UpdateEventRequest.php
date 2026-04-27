<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEventRequest extends FormRequest
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
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'start_date' => 'sometimes|date',
            'start_time' => 'nullable|string',
            'end_date' => 'sometimes|date',
            'end_time' => 'nullable|string',
            'max_participants' => 'sometimes|integer|min:1',
            'price' => 'sometimes|numeric|min:0',
            'id_gym' => 'sometimes|exists:gyms,id_gym',
            'reward_amount' => 'sometimes|numeric|min:0',
            'is_rewarded' => 'sometimes|boolean',
            'max_winners' => 'sometimes|integer|min:1',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'start_date.date' => 'Start date must be a valid date',
            'end_date.date' => 'End date must be a valid date',
            'max_participants.integer' => 'Maximum participants must be a number',
            'id_gym.exists' => 'Selected gym does not exist',
        ];
    }
}
