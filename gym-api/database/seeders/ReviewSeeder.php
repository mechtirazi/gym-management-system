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
        // Create 30 reviews
        Review::factory()->count(30)->create();

        echo "✓ Created 30 reviews successfully!\n";
    }
}
