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
            'name'     => $this->faker->word().' Supplement',
            'price'    => $this->faker->numberBetween(10, 150),
            'stock'    => $this->faker->numberBetween(0, 100),
            'category' => $this->faker->randomElement(['Protein', 'Vitamins', 'Equipment', 'Snacks', 'Drinks']),
        ];
    }
}
