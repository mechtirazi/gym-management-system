<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Gym>
 */
class GymFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company().' Gym',
            'adress' => fake()->address(),
            'capacity' => fake()->numberBetween(50, 500),
            'open_hour' => fake()->randomElement([
                '6:00 AM - 10:00 PM',
                '7:00 AM - 11:00 PM',
                '5:00 AM - 9:00 PM',
                '24/7',
                '6:30 AM - 10:30 PM',
            ]),
            'id_owner' => User::where('role', 'owner')->inRandomOrder()->first()?->id_user
                ?? User::factory()->owner()->create()->id_user,
        ];
    }
}
