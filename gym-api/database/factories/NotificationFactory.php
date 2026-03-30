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
        $type = fake()->randomElement(['info', 'warning', 'success', 'error']);
        $text = fake()->randomElement([
            'Your subscription is expiring soon',
            'New course available: ' . fake()->word(),
            'Your session scheduled for tomorrow',
            'Payment received successfully',
            'New event registered',
            'Workout reminder: ' . fake()->sentence(),
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
            'title' => fake()->randomElement($titles),
            'text' => $text,
            'type' => $type,
            'is_read' => fake()->boolean(20), // 20% chance of being read
        ];
    }
}
