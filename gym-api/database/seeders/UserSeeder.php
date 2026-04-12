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

        // Create 5 receptionists
        User::factory()->receptionist()->count(5)->create();

        // Create 4 gym owners
        User::factory()->owner()->count(4)->create();

        // Create 2 fixed receptionist accounts for easy login/testing
        User::factory()->receptionist()->create([
            'name' => 'Reception',
            'last_name' => 'One',
            'email' => 'receptionist1@gym.local',
            'password' => 'password123',
            'phone' => '+1000000001',
        ]);

        User::factory()->receptionist()->create([
            'name' => 'Reception',
            'last_name' => 'Two',
            'email' => 'receptionist2@gym.local',
            'password' => 'password123',
            'phone' => '+1000000002',
        ]);

        echo "✓ Created test users successfully (including receptionists)!\n";
    }
}
