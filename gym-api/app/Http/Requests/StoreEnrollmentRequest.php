<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEnrollmentRequest extends FormRequest
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
            'id_member' => 'required|exists:users,id_user',
            'id_gym' => 'required|exists:gyms,id_gym',
            'enrollment_date' => 'required|date',
            'status' => 'sometimes|in:active,pending,cancelled,expired',
            'type' => 'sometimes|in:standard,premium,trial',
            'id_plan' => 'sometimes|nullable|exists:membership_plans,id',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'id_member.required' => 'Member ID is required',
            'id_member.exists' => 'Selected member does not exist',
            'id_gym.required' => 'Gym ID is required',
            'id_gym.exists' => 'Selected gym does not exist',
            'enrollment_date.required' => 'Enrollment date is required',
            'enrollment_date.date' => 'Enrollment date must be a valid date',
        ];
    }
}
