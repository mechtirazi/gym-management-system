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
            'name' => fake()->word().' Training',
            'description' => fake()->paragraph(),
            'id_gym' => Gym::inRandomOrder()->first()?->id_gym ?? Gym::factory(),
            'price' => fake()->numberBetween(20, 100),
            'max_capacity' => fake()->numberBetween(10, 30),
            'count' => fake()->numberBetween(1, 20),
            'duration' => fake()->numberBetween(4, 12).' weeks',
        ];
    }
}
