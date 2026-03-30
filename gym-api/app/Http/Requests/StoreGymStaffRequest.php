<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGymStaffRequest extends FormRequest
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
            'id_gym' => 'required|exists:gyms,id_gym',
            'id_user' => 'required|exists:users,id_user',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'id_gym.required' => 'Gym ID is required',
            'id_gym.exists' => 'Selected gym does not exist',
            'id_user.required' => 'User ID is required',
            'id_user.exists' => 'Selected user does not exist',
        ];
    }
}
