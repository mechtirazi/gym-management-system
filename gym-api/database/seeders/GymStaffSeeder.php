<?php

namespace Database\Seeders;

use App\Models\GymStaff;
use App\Models\Gym;
use App\Models\User;
use Illuminate\Database\Seeder;

class GymStaffSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $gyms = Gym::all();
        $staff = User::whereIn('role', [
            User::ROLE_TRAINER,
            User::ROLE_NUTRITIONIST,
            User::ROLE_RECEPTIONIST,
        ])->get();

        if ($gyms->isEmpty() || $staff->isEmpty()) {
            echo "⚠️ Gyms or Staff missing. Skipping GymStaff seeding.\n";

            return;
        }

        // Assign each staff member to at least one random gym
        foreach ($staff as $user) {
            GymStaff::firstOrCreate([
                'id_user' => $user->id_user,
            ], [
                'id_gym' => $gyms->random()->id_gym,
            ]);
        }

        echo '✓ Created '.$staff->count()." gym staff assignments successfully!\n";
    }
}
