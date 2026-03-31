<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use App\Models\Enrollment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AttendanceEvent>
 */
class AttendanceEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $event = Event::inRandomOrder()->first() ?? Event::factory()->create();
        $gymId = $event->id_gym;

        // Try to find a member enrolled in this gym
        $memberId = Enrollment::where('id_gym', $gymId)
            ->inRandomOrder()
            ->first()?->id_user;

        // Fallback
        if (! $memberId) {
            $memberId = User::where('role', User::ROLE_MEMBER)->inRandomOrder()->first()?->id_user ?? User::factory()->member();
        }

        return [
            'id_member' => $memberId,
            'id_event' => $event->id_event,
            'status' => $this->faker->randomElement(['cancelled', 'upcoming', 'ongoing', 'completed']),
        ];
    }
}
