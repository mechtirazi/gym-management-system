<?php

namespace Database\Seeders;

use App\Models\Enrollment;
use App\Models\User;
use App\Models\Gym;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EnrollmentSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the enrollments table.
     */
    public function run(): void
    {
        // Get members and gyms
        $members = User::where('role', 'member')->get();
        $gyms = Gym::all();

        if ($members->isEmpty() || $gyms->isEmpty()) {
            echo "   ⚠️  No members or gyms found. Skipping enrollments.\n";

            return;
        }

        // Create enrollments for each member in each gym (with some variation)
        foreach ($members as $member) {
            // Enroll member in 2-3 random gyms
            $selectedGyms = $gyms->random(rand(2, min(3, $gyms->count())));

            foreach ($selectedGyms as $gym) {
                // Check if enrollment already exists
                $exists = Enrollment::where('id_member', $member->id_user)
                    ->where('id_gym', $gym->id_gym)
                    ->exists();

                if (! $exists) {
                    Enrollment::create([
                        'id_member' => $member->id_user,
                        'id_gym' => $gym->id_gym,
                        'enrollment_date' => fake()->dateTimeBetween('-6 months', 'now'),
                    ]);
                }
            }
        }

        echo "   ✅ Enrollments seeded successfully\n";
    }
}
