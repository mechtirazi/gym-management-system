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
        $reviewType = $this->faker->randomElement(['event', 'trainer', 'course', 'session']);
        
        $data = [
            'id_user' => User::where('role', 'member')->inRandomOrder()->first()?->id_user ?? User::factory()->member(),
            'rating' => $this->faker->numberBetween(1, 5),
            'comment' => $this->faker->sentence(),
            'ai_sentiment_score' => $this->faker->randomFloat(2, -1, 1),
            'ai_category' => $this->faker->randomElement(['positive', 'neutral', 'negative']),
            'review_date' => $this->faker->dateTimeBetween('-60 days', 'now'),
            'id_event' => null,
            'id_trainer' => null,
            'id_course' => null,
            'id_session' => null,
        ];

        switch ($reviewType) {
            case 'event':
                $data['id_event'] = \App\Models\Event::inRandomOrder()->first()?->id_event ?? \App\Models\Event::factory();
                break;
            case 'trainer':
                $data['id_trainer'] = \App\Models\User::where('role', 'trainer')->inRandomOrder()->first()?->id_user ?? \App\Models\User::factory()->state(['role' => 'trainer']);
                break;
            case 'course':
                $data['id_course'] = \App\Models\Course::inRandomOrder()->first()?->id_course ?? \App\Models\Course::factory();
                break;
            case 'session':
                $data['id_session'] = \App\Models\Session::inRandomOrder()->first()?->id_session ?? \App\Models\Session::factory();
                break;
        }

        return $data;
    }
}
