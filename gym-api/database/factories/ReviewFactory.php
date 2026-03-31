<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Review>
 */
class ReviewFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_user' => User::where('role', 'member')->inRandomOrder()->first()?->id_user ?? User::factory()->member(),
            'id_event' => Event::inRandomOrder()->first()?->id_event ?? Event::factory(),
            'rating' => $this->faker->numberBetween(1, 5),
            'comment' => $this->faker->sentence(),
            'ai_sentiment_score' => $this->faker->randomFloat(2, -1, 1),
            'ai_category' => $this->faker->randomElement(['positive', 'neutral', 'negative']),
            'review_date' => $this->faker->dateTimeBetween('-30 days', 'now'),
        ];
    }
}
