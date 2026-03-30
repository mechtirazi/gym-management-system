<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubscribeRequest extends FormRequest
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
            'id_gym' => 'required|exists:gyms,id_gym',
            'id_user' => 'required|exists:users,id_user',
            'status' => 'required|in:inactive,active,expired,cancelled',
            'subscribe_date' => 'required|date',
        ];
    }

    public function messages(): array
    {
        return [
            'id_gym.required' => 'Gym ID is required',
            'id_gym.exists' => 'Gym not found',
            'id_user.required' => 'User ID is required',
            'id_user.exists' => 'User not found',
            'status.required' => 'Status is required',
            'status.in' => 'Status must be one of: inactive, active, expired, cancelled',
            'subscribe_date.required' => 'Subscribe date is required',
            'subscribe_date.date' => 'Subscribe date must be a valid date',
        ];
    }
}
