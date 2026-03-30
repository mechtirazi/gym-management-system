<?php

namespace Database\Seeders;

use App\Models\Gym;
use App\Models\User;
use Illuminate\Database\Seeder;

class GymSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get gym owners
        $owners = User::where('role', 'owner')->get();

        if ($owners->isEmpty()) {
            echo "❌ No gym owners found. Run UserSeeder first!\n";

            return;
        }

        // Create 1 gym per owner
        foreach ($owners as $owner) {
            Gym::factory()->create([
                'id_owner' => $owner->id_user,
            ]);
        }

        // Create 2 additional gyms with random owners
        Gym::factory()->count(2)->create();

        echo '✓ Created '.$owners->count() + 2 ." gyms successfully!\n";
    }
}
