<?php

namespace Database\Factories;

use App\Models\Gym;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\NutritionPlan>
 */
class NutritionPlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('-30 days', 'now');

        return [
            'id_gym'           => Gym::inRandomOrder()->first()?->id_gym,
            'goal'             => fake()->randomElement(['Weight Loss', 'Muscle Gain', 'Maintenance', 'Endurance', 'Strength']),
            'start_date'       => $startDate,
            'end_date'         => fake()->dateTimeBetween($startDate, $startDate->modify('+90 days')),
            'id_nutritionist'  => User::where('role', 'nutritionist')->inRandomOrder()->first()?->id_user ?? User::factory()->nutritionist(),
            'id_member'        => null,
            'price'            => fake()->numberBetween(50, 300),
        ];
    }
}
