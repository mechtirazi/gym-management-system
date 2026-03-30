<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttendanceRequest extends FormRequest
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
            'id_session' => 'required|exists:sessions,id_session',
            'status' => 'required|in:absent,present,late',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'id_member.required' => 'Member is required',
            'id_member.exists' => 'Selected member does not exist',
            'id_session.required' => 'Session is required',
            'id_session.exists' => 'Selected session does not exist',
            'status.required' => 'Attendance status is required',
            'status.in' => 'Status must be one of: absent, present, late',
        ];
    }
}
