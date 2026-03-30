<?php

namespace Database\Seeders;

use App\Models\AttendanceEvent;
use Illuminate\Database\Seeder;

class AttendanceEventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 50 event attendance records
        AttendanceEvent::factory()->count(50)->create();

        echo "✓ Created 50 event attendance records successfully!\n";
    }
}
