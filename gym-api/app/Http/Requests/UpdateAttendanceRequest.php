<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAttendanceRequest extends FormRequest
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
            'id_session' => 'sometimes|exists:sessions,id_session',
            'status' => 'sometimes|in:absent,present,late',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'id_member.exists' => 'Selected member does not exist',
            'id_session.exists' => 'Selected session does not exist',
            'status.in' => 'Status must be one of: absent, present, late',
        ];
    }
}
