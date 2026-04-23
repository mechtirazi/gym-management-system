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
            'id_gym' => null, // Set in seeder
            'id_user' => null, // Set in seeder
            'status' => $this->faker->randomElement(['active', 'inactive', 'expired', 'cancelled']),
            'subscribe_date' => $this->faker->dateTimeBetween('-60 days', 'now'),
        ];
    }
}
