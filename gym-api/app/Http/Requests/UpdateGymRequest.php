<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGymRequest extends FormRequest
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
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'phone' => 'sometimes|string|max:20',
            'description' => 'sometimes|string',
            'adress' => 'sometimes|string|max:255',
            'capacity' => 'sometimes|integer|min:1',
            'open_hour' => 'sometimes|string|max:255',
            'open_mon_fri' => 'sometimes|string|max:255',
            'open_sat' => 'sometimes|string|max:255',
            'open_sun' => 'sometimes|string|max:255',
            'id_owner' => 'sometimes|exists:users,id_user',
            'picture' => 'nullable|string',
            'logo' => 'nullable|image|max:10240',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'capacity.integer' => 'Capacity must be a number',
            'id_owner.exists' => 'Selected owner does not exist',
        ];
    }
}
