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
            'adress' => 'sometimes|string|max:255',
            'capacity' => 'sometimes|integer|min:1',
            'open_hour' => 'sometimes|string|max:255',
            'id_owner' => 'sometimes|exists:users,id_user',
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
