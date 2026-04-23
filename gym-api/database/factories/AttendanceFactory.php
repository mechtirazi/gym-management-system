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
        return [
            'id_member' => null, // Set in seeder
            'id_session' => null, // Set in seeder
            'status' => $this->faker->randomElement(['absent', 'present', 'late']),
        ];
    }
}
