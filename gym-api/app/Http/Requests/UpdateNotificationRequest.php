<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'text' => 'sometimes|string',
            'id_user' => 'sometimes|exists:users,id_user',
        ];
    }

    public function messages(): array
    {
        return [
            'text.string' => 'Notification text must be a string',
            'id_user.exists' => 'User not found',
        ];
    }
}
