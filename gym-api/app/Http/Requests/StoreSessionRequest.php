<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSessionRequest extends FormRequest
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
            'date_session' => 'required|date',
            'start_time' => 'required|date_format:H:i:s',
            'end_time' => 'required|date_format:H:i:s|after:start_time',
            'id_course' => 'required|exists:courses,id_course',
            'status' => 'required|in:cancelled,upcoming,ongoing,completed',
            'id_trainer' => 'required|exists:users,id_user',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'date_session.required' => 'Session date is required',
            'date_session.date' => 'Session date must be a valid date',
            'start_time.required' => 'Start time is required',
            'start_time.date_format' => 'Start time must be in HH:MM:SS format',
            'end_time.required' => 'End time is required',
            'end_time.date_format' => 'End time must be in HH:MM:SS format',
            'end_time.after' => 'End time must be after start time',
            'id_course.required' => 'Course is required',
            'id_course.exists' => 'Selected course does not exist',
            'status.required' => 'Session status is required',
            'status.in' => 'Status must be one of: cancelled, upcoming, ongoing, completed',
            'id_trainer.required' => 'Trainer is required',
            'id_trainer.exists' => 'Selected trainer does not exist',
        ];
    }
}
