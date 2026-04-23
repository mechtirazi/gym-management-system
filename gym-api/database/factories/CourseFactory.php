<?php

namespace Database\Factories;

use App\Models\Gym;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Course>
 */
class CourseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_course' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => $this->faker->word().' Training',
            'description' => $this->faker->paragraph(),
            'id_gym' => null, // Will be overridden in Seeder
            'price' => $this->faker->numberBetween(20, 100),
            'max_capacity' => 20,
            'count' => 0, // Should be calculated in Seeder
            'duration' => $this->faker->numberBetween(4, 12).' weeks',
        ];
    }
}
