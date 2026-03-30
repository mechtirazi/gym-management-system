<?php

namespace Database\Factories;

use App\Models\Gym;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Subscribe>
 */
class SubscribeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_gym' => Gym::inRandomOrder()->first()?->id_gym ?? Gym::factory(),
            'id_user' => User::where('role', 'member')->inRandomOrder()->first()?->id_user ?? User::factory()->member(),
            'status' => fake()->randomElement(['active', 'inactive', 'expired', 'cancelled']),
            'subscribe_date' => fake()->dateTimeBetween('-60 days', 'now'),
        ];
    }
}
