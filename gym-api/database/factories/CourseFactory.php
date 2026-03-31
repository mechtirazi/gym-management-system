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
            'id_gym' => Gym::inRandomOrder()->first()?->id_gym ?? Gym::factory(),
            'price' => $this->faker->numberBetween(20, 100),
            'max_capacity' => $this->faker->numberBetween(10, 30),
            'count' => $this->faker->numberBetween(1, 20),
            'duration' => $this->faker->numberBetween(4, 12).' weeks',
        ];
    }
}
