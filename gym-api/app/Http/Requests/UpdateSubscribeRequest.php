<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSubscribeRequest extends FormRequest
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
            'id_gym' => 'sometimes|exists:gyms,id_gym',
            'id_user' => 'sometimes|exists:users,id_user',
            'status' => 'sometimes|in:inactive,active,expired,cancelled',
            'subscribe_date' => 'sometimes|date',
        ];
    }

    public function messages(): array
    {
        return [
            'id_gym.exists' => 'Gym not found',
            'id_user.exists' => 'User not found',
            'status.in' => 'Status must be one of: inactive, active, expired, cancelled',
            'subscribe_date.date' => 'Subscribe date must be a valid date',
        ];
    }
}
