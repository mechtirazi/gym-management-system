<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNutritionPlanRequest extends FormRequest
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
            'goal' => 'sometimes|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'id_nutritionist' => 'sometimes|exists:users,id_user',
            'id_members' => 'sometimes|array',
            'id_members.*' => 'exists:users,id_user',
            'price' => 'sometimes|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'goal.string' => 'Goal must be a string',
            'start_date.date' => 'Start date must be a valid date',
            'end_date.date' => 'End date must be a valid date',
            'end_date.after' => 'End date must be after start date',
            'id_nutritionist.exists' => 'Nutritionist not found',
            'id_member.exists' => 'Member not found',
            'price.numeric' => 'Price must be a number',
            'price.min' => 'Price must be at least 0',
        ];
    }
}
