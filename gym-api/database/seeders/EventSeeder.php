<?php

namespace Database\Seeders;

use App\Models\Event;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 10 events
        Event::factory()->count(10)->create();

        echo "✓ Created 10 events successfully!\n";
    }
}
