<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 2 super admin users
        User::factory()->superAdmin()->count(2)->create();

        // Create 5 trainers
        User::factory()->trainer()->count(5)->create();

        // Create 20 members
        User::factory()->member()->count(20)->create();

        // Create 3 nutritionists
        User::factory()->nutritionist()->count(3)->create();

        // Create 4 gym owners
        User::factory()->owner()->count(4)->create();

        echo "✓ Created 34 test users successfully!\n";
    }
}
