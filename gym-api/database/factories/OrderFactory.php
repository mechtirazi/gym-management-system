<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_date' => fake()->dateTimeBetween('-30 days', 'now'),
            'status' => fake()->randomElement(['pending', 'confirmed', 'completed', 'cancelled']),
            'id_member' => User::where('role', 'member')->inRandomOrder()->first()?->id_user ?? User::factory()->member(),
        ];
    }
}
