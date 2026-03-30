<?php

namespace Database\Seeders;

use App\Models\Course;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 15 courses
        Course::factory()->count(15)->create();

        echo "✓ Created 15 courses successfully!\n";
    }
}
