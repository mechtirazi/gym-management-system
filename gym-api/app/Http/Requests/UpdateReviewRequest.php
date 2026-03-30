<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateReviewRequest extends FormRequest
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
            'id_user' => 'sometimes|exists:users,id_user',
            'id_event' => 'sometimes|exists:events,id_event',
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'nullable|string',
            'review_date' => 'sometimes|date',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'id_user.exists' => 'Selected user does not exist',
            'id_event.exists' => 'Selected event does not exist',
            'rating.integer' => 'Rating must be a number',
            'rating.min' => 'Rating must be at least 1',
            'rating.max' => 'Rating must not exceed 5',
            'review_date.date' => 'Review date must be a valid date',
        ];
    }
}
