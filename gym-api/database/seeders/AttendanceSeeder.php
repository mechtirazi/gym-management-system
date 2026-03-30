<?php

namespace Database\Seeders;

use App\Models\Attendance;
use Illuminate\Database\Seeder;

class AttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 100 attendance records
        Attendance::factory()->count(100)->create();

        echo "✓ Created 100 attendance records successfully!\n";
    }
}
