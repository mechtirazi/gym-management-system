<?php

namespace Database\Seeders;

use App\Models\Session;
use Illuminate\Database\Seeder;

class SessionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 30 sessions
        Session::factory()->count(30)->create();

        echo "✓ Created 30 sessions successfully!\n";
    }
}
