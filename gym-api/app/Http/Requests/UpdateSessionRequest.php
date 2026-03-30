<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSessionRequest extends FormRequest
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
            'date_session' => 'sometimes|date',
            'start_time' => 'sometimes|date_format:H:i:s',
            'end_time' => 'sometimes|date_format:H:i:s',
            'id_course' => 'sometimes|exists:courses,id_course',
            'status' => 'sometimes|in:cancelled,upcoming,ongoing,completed',
            'id_trainer' => 'sometimes|exists:users,id_user',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'date_session.date' => 'Session date must be a valid date',
            'start_time.date_format' => 'Start time must be in HH:ii:ss format',
            'end_time.date_format' => 'End time must be in HH:ii:ss format',
            'id_course.exists' => 'Selected course does not exist',
            'status.in' => 'Status must be one of: cancelled, upcoming, ongoing, completed',
            'id_trainer.exists' => 'Selected trainer does not exist',
        ];
    }
}
