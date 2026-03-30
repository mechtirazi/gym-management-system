<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttendanceEventRequest extends FormRequest
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
            'id_event' => 'required|exists:events,id_event',
            'status' => 'required|in:cancelled,upcoming,ongoing,completed',
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
            'id_event.required' => 'Event is required',
            'id_event.exists' => 'Selected event does not exist',
            'status.required' => 'Attendance status is required',
            'status.in' => 'Status must be one of: cancelled, upcoming, ongoing, completed',
        ];
    }
}
