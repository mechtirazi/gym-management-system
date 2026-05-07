<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNutritionPlanRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string', // Could be a path or base64
            'goal' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'id_nutritionist' => 'required|exists:users,id_user',
            'id_members' => 'nullable|array',
            'id_members.*' => 'exists:users,id_user',
            'price' => 'required|numeric|min:0',
            'protein' => 'nullable|numeric',
            'carbs' => 'nullable|numeric',
            'fats' => 'nullable|numeric',
            'calories' => 'nullable|numeric',
            'score' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            
            // Nested Meals
            'meals' => 'nullable|array',
            'meals.*.name' => 'required|string',
            'meals.*.time' => 'required|string',
            'meals.*.description' => 'nullable|string',
            'meals.*.protein' => 'nullable|numeric',
            'meals.*.carbs' => 'nullable|numeric',
            'meals.*.fats' => 'nullable|numeric',
            'meals.*.calories' => 'nullable|numeric',

            // Nested Supplements
            'supplements' => 'nullable|array',
            'supplements.*.name' => 'required|string',
            'supplements.*.dosage' => 'required|string',
            'supplements.*.timing' => 'required|string',
            'supplements.*.type' => 'required|string|in:capsule,powder,liquid',
        ];
    }

    public function messages(): array
    {
        return [
            'goal.required' => 'Goal is required',
            'goal.string' => 'Goal must be a string',
            'start_date.required' => 'Start date is required',
            'start_date.date' => 'Start date must be a valid date',
            'end_date.required' => 'End date is required',
            'end_date.date' => 'End date must be a valid date',
            'end_date.after' => 'End date must be after start date',
            'id_nutritionist.required' => 'Nutritionist ID is required',
            'id_nutritionist.exists' => 'Nutritionist not found',
            'id_member.required' => 'Member ID is required',
            'id_member.exists' => 'Member not found',
            'price.required' => 'Price is required',
            'price.numeric' => 'Price must be a number',
            'price.min' => 'Price must be at least 0',
        ];
    }
}
