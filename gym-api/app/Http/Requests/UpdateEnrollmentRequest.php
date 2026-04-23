<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEnrollmentRequest extends FormRequest
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
            'id_member' => 'sometimes|exists:users,id_user',
            'id_gym' => 'sometimes|exists:gyms,id_gym',
            'enrollment_date' => 'sometimes|date',
            'status' => 'sometimes|in:active,pending,cancelled,expired',
            'type' => 'sometimes|in:standard,premium,trial',
            'id_plan' => 'sometimes|nullable|exists:membership_plans,id',
        ];
    }
}
