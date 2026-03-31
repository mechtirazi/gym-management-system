<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Session>
 */
class SessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = $this->faker->dateTimeBetween('now', '+30 days');

        return [
            'date_session' => $date,
            'start_time' => $this->faker->randomElement(['06:00', '08:00', '10:00', '14:00', '16:00', '18:00', '20:00']),
            'end_time' => $this->faker->randomElement(['07:00', '09:00', '11:00', '15:00', '17:00', '19:00', '21:00']),
            'id_course' => Course::inRandomOrder()->first()?->id_course ?? Course::factory(),
            'status' => $this->faker->randomElement(['cancelled', 'upcoming', 'ongoing', 'completed']),
            'id_trainer' => User::where('role', 'trainer')->inRandomOrder()->first()?->id_user ?? User::factory()->trainer(),
        ];
    }
}
