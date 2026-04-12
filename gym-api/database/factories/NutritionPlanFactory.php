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
        $startDate = $this->faker->dateTimeBetween('-30 days', 'now');

        return [
            'id_gym'           => Gym::inRandomOrder()->first()?->id_gym,
            'name'             => $this->faker->words(3, true) . ' Protocol',
            'description'      => $this->faker->sentence(10),
            'goal'             => $this->faker->randomElement(['Weight Loss', 'Muscle Gain', 'Maintenance', 'Endurance', 'Strength']),
            'protein'          => $this->faker->numberBetween(80, 250),
            'carbs'            => $this->faker->numberBetween(100, 400),
            'fats'             => $this->faker->numberBetween(40, 120),
            'calories'         => $this->faker->numberBetween(1500, 3500),
            'score'            => $this->faker->numberBetween(60, 100),
            'is_active'        => $this->faker->boolean(80),
            'start_date'       => $startDate,
            'end_date'         => $this->faker->dateTimeBetween($startDate, $startDate->modify('+90 days')),
            'id_nutritionist'  => User::where('role', 'nutritionist')->inRandomOrder()->first()?->id_user ?? User::factory()->nutritionist(),
            'id_member'        => null,
            'price'            => $this->faker->numberBetween(50, 300),
        ];
    }
}
