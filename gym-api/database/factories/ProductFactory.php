<?php

namespace Database\Factories;

use App\Models\Gym;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_gym'   => Gym::inRandomOrder()->first()?->id_gym,
            'name'     => fake()->word().' Supplement',
            'price'    => fake()->numberBetween(10, 150),
            'stock'    => fake()->numberBetween(0, 100),
            'category' => fake()->randomElement(['Protein', 'Vitamins', 'Equipment', 'Snacks', 'Drinks']),
        ];
    }
}
