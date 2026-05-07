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
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'image' => 'sometimes|nullable|string',
            'goal' => 'sometimes|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'id_nutritionist' => 'sometimes|exists:users,id_user',
            'id_members' => 'sometimes|array',
            'id_members.*' => 'exists:users,id_user',
            'price' => 'sometimes|numeric|min:0',
            'protein' => 'sometimes|nullable|numeric',
            'carbs' => 'sometimes|nullable|numeric',
            'fats' => 'sometimes|nullable|numeric',
            'calories' => 'sometimes|nullable|numeric',
            'score' => 'sometimes|nullable|integer',
            'is_active' => 'sometimes|nullable|boolean',

            // Nested Meals
            'meals' => 'sometimes|array',
            'meals.*.name' => 'required_with:meals|string',
            'meals.*.time' => 'required_with:meals|string',
            'meals.*.description' => 'nullable|string',
            'meals.*.protein' => 'nullable|numeric',
            'meals.*.carbs' => 'nullable|numeric',
            'meals.*.fats' => 'nullable|numeric',
            'meals.*.calories' => 'nullable|numeric',

            // Nested Supplements
            'supplements' => 'sometimes|array',
            'supplements.*.name' => 'required_with:supplements|string',
            'supplements.*.dosage' => 'required_with:supplements|string',
            'supplements.*.timing' => 'required_with:supplements|string',
            'supplements.*.type' => 'required_with:supplements|string|in:capsule,powder,liquid',
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
