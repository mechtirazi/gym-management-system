<?php

namespace Database\Seeders;

use App\Models\Notification;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 80 notifications
        Notification::factory()->count(80)->create();

        echo "✓ Created 80 notifications successfully!\n";
    }
}
