<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGymRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'adress' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'open_hour' => 'required|string|max:255',
            'id_owner' => 'required|exists:users,id_user',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Gym name is required',
            'adress.required' => 'Gym address is required',
            'capacity.required' => 'Gym capacity is required',
            'capacity.integer' => 'Capacity must be a number',
            'open_hour.required' => 'Opening hours are required',
            'id_owner.required' => 'Owner is required',
            'id_owner.exists' => 'Selected owner does not exist',
        ];
    }
}
