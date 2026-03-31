<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Notification>
 */
class NotificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = $this->faker->randomElement(['info', 'warning', 'success', 'error']);
        $text = $this->faker->randomElement([
            'Your subscription is expiring soon',
            'New course available: ' . $this->faker->word(),
            'Your session scheduled for tomorrow',
            'Payment received successfully',
            'New event registered',
            'Workout reminder: ' . $this->faker->sentence(),
            'Your trainer sent you a message',
        ]);

        $titles = [
            'Subscription Update',
            'Course Alert',
            'Session Reminder',
            'Payment Confirmation',
            'Event Alert',
            'Workout Plan',
            'New Message',
        ];

        return [
            'id_user' => User::inRandomOrder()->first()?->id_user ?? User::factory(),
            'title' => $this->faker->randomElement($titles),
            'text' => $text,
            'type' => $type,
            'is_read' => $this->faker->boolean(20), // 20% chance of being read
        ];
    }
}
