<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNotificationRequest extends FormRequest
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
            'title' => 'nullable|string|max:255',
            'text' => 'required|string',
            'type' => 'nullable|string|in:info,success,warning,error',
            'id_user' => 'required|exists:users,id_user',
        ];
    }

    public function messages(): array
    {
        return [
            'text.required' => 'Notification text is required',
            'text.string' => 'Notification text must be a string',
            'id_user.required' => 'User ID is required',
            'id_user.exists' => 'User not found',
        ];
    }
}
