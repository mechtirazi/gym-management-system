<?php

namespace Database\Factories;

use App\Models\Gym;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Event>
 */
class EventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('now', '+60 days');

        return [
            'title' => fake()->catchPhrase().' Event',
            'description' => fake()->paragraph(),
            'start_date' => $startDate,
            'end_date' => fake()->dateTimeBetween($startDate, $startDate->modify('+7 days')),
            'max_participants' => fake()->numberBetween(50, 200),
            'id_gym' => Gym::inRandomOrder()->first()?->id_gym ?? Gym::factory(),
        ];
    }
}
