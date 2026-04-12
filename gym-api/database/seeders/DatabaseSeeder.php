<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

// Import all seeders

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        echo "\n🌱 Starting database seeding...\n\n";

        $this->call([
            // Base data first
            UserSeeder::class,
            GymSeeder::class,

            // Create Passport Personal Access Client
        ]);
        \Illuminate\Support\Facades\Artisan::call('passport:client', [
            '--personal' => true,
            '--name' => 'Gym Personal Access Client',
            '--no-interaction' => true,
        ]);
        \Laravel\Passport\Client::where('name', 'Gym Personal Access Client')->update(['personal_access_client' => 1]);
        $this->call([
            // Link users to gyms
            GymStaffSeeder::class,
            EnrollmentSeeder::class,

            // Courses and Sessions
            CourseSeeder::class,
            SessionSeeder::class,

            // Attendance tracking
            AttendanceSeeder::class,

            // Events
            EventSeeder::class,
            AttendanceEventSeeder::class,

            // Products and Orders
            ProductSeeder::class,
            OrderSeeder::class,

            // Payments
            PaymentSeeder::class,

            // Reviews
            ReviewSeeder::class,

            // Subscriptions
            SubscribeSeeder::class,

            // Nutrition Plans
            NutritionPlanSeeder::class,

            // Enrollments
            EnrollmentSeeder::class,

            // Notifications
            NotificationSeeder::class,
        ]);
        echo "\n   [+] Injecting specific 'Recent/Today' data to populate Dashboard immediately...\n";
        
        // 1. Give every gym some fresh ACTIVE subscriptions created today
        $gyms = \App\Models\Gym::all();
        foreach($gyms as $gym) {
            \App\Models\Subscribe::factory()->count(5)->create([
                'id_gym' => $gym->id_gym,
                'status' => 'active',
                'subscribe_date' => \Carbon\Carbon::now(),
                'created_at' => \Carbon\Carbon::now(),
            ]);
            
            // Give every gym some fresh payments today for revenue chart
            \App\Models\Payment::factory()->count(10)->create([
                'id_gym' => $gym->id_gym,
                'created_at' => \Carbon\Carbon::now(),
                'updated_at' => \Carbon\Carbon::now(),
            ]);

            // Give every gym some recent attendances for the Live Feed
            $sessions = \App\Models\Session::whereHas('course', function($q) use ($gym) {
                $q->where('id_gym', $gym->id_gym);
            })->inRandomOrder()->take(2)->get();

            foreach($sessions as $session) {
                \App\Models\Attendance::factory()->count(4)->create([
                    'id_session' => $session->id_session,
                    'status' => 'present',
                    'created_at' => \Carbon\Carbon::now()->subMinutes(rand(1, 60)),
                    'updated_at' => \Carbon\Carbon::now(),
                ]);
            }
        }

        echo "\n✅ Database seeding completed successfully!\n";
        echo "📊 Total Records Created:\n";
        echo "   • Users (includes super admins, owners, trainers, members, nutritionists, receptionists)\n";
        echo "   • 6 Gyms\n";
        echo "   • 12 Gym Staff Assignments\n";
        echo "   • 30-40 Enrollments\n";
        echo "   • 15 Courses\n";
        echo "   • 30 Sessions\n";
        echo "   • 100+ Attendance Records\n";
        echo "   • 10 Events\n";
        echo "   • 50 Event Attendance Records\n";
        echo "   • 25 Products\n";
        echo "   • 40 Orders (with products)\n";
        echo "   • 100+ Payments (including hot data)\n";
        echo "   • 30 Reviews\n";
        echo "   • 80+ Subscriptions\n";
        echo "   • 20 Nutrition Plans\n";
        echo "   • 80 Notifications\n\n";
    }
}
