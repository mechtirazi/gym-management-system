<?php

namespace Database\Seeders;

use App\Models\Subscribe;
use Illuminate\Database\Seeder;

class SubscribeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 60 subscriptions
        Subscribe::factory()->count(60)->create();

        echo "✓ Created 60 subscriptions successfully!\n";
    }
}
