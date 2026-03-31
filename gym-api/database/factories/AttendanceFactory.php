<?php

namespace Database\Factories;

use App\Models\Session;
use App\Models\User;
use App\Models\Enrollment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Attendance>
 */
class AttendanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $session = Session::inRandomOrder()->first() ?? Session::factory()->create();
        $gymId = $session->course->id_gym;

        // Try to find a member enrolled in this gym
        $memberId = Enrollment::where('id_gym', $gymId)
            ->inRandomOrder()
            ->first()?->id_user;

        // Fallback to random member if no enrollments exist yet (seeders run in order, so this might happen if seeder order is wrong)
        if (! $memberId) {
            $memberId = User::where('role', User::ROLE_MEMBER)->inRandomOrder()->first()?->id_user ?? User::factory()->member();
        }

        return [
            'id_member' => $memberId,
            'id_session' => $session->id_session,
            'status' => $this->faker->randomElement(['absent', 'present', 'late']),
        ];
    }
}
