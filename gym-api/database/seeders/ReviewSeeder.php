<?php

namespace Database\Seeders;

use App\Models\Review;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 100 reviews across all types (event, trainer, course, session)
        Review::factory()->count(100)->create();

        echo "✓ Created 100 reviews successfully!\n";
    }
}
