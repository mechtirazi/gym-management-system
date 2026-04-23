<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Gym;
use App\Models\GymStaff;
use App\Models\Enrollment;
use App\Models\Subscribe;
use App\Models\Course;
use App\Models\Session;
use App\Models\Attendance;
use App\Models\MembershipPlan;
use Carbon\Carbon;
use Illuminate\Support\Facades\Artisan;
use Laravel\Passport\Client;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        echo "\n🌱 Starting Logically Consistent Database Seeding...\n\n";

        // 1. Super Admins
        User::factory()->superAdmin()->count(2)->create();

        // 2. Setup Passport Client
        Artisan::call('passport:client', [
            '--personal' => true,
            '--name' => 'Gym Personal Access Client',
            '--no-interaction' => true,
        ]);
        Client::where('name', 'Gym Personal Access Client')->update(['personal_access_client' => 1]);

        // Specific Test Receptionist for easy login
        $receptionistTest = User::factory()->receptionist()->create([
            'name' => 'Reception',
            'last_name' => 'One',
            'email' => 'receptionist1@gym.local',
            'password' => 'password123',
            'phone' => '+1000000001',
        ]);
        $receptionistTest2 = User::factory()->receptionist()->create([
            'name' => 'Reception',
            'last_name' => 'Two',
            'email' => 'receptionist2@gym.local',
            'password' => 'password123',
            'phone' => '+1000000002',
        ]);

        // Retrieve plans (created by migration 2026_04_13_000002)
        $plans = MembershipPlan::all();
        $defaultPlanId = $plans->first()?->id_plan;

        echo "🏢 Creating 4 Gyms and populating logically...\n";
        
        $totalMembers = 0;
        $totalCourses = 0;
        $totalSessions = 0;
        $totalAttendances = 0;

        for ($i = 0; $i < 4; $i++) {
            // Create 1 Owner
            $owner = User::factory()->owner()->create();

            // Create Gym for Owner
            $gym = Gym::factory()->create([
                'id_owner' => $owner->id_user,
            ]);

            // Create Staff (Trainers, Receptionists, Nutritionists)
            $trainers = User::factory()->trainer()->count(3)->create();
            $receptionists = User::factory()->receptionist()->count(2)->create();
            $nutritionists = User::factory()->nutritionist()->count(1)->create();

            $staff = $trainers->merge($receptionists)->merge($nutritionists);

            // Assign staff to gym
            foreach ($staff as $s) {
                GymStaff::create([
                    'id_gym_staff' => \Illuminate\Support\Str::uuid()->toString(),
                    'id_gym' => $gym->id_gym,
                    'id_user' => $s->id_user
                ]);
            }

            // Assign test receptionists to first and second gyms respectively
            if ($i == 0) {
                GymStaff::create(['id_gym_staff' => \Illuminate\Support\Str::uuid()->toString(), 'id_gym' => $gym->id_gym, 'id_user' => $receptionistTest->id_user]);
            }
            if ($i == 1) {
                GymStaff::create(['id_gym_staff' => \Illuminate\Support\Str::uuid()->toString(), 'id_gym' => $gym->id_gym, 'id_user' => $receptionistTest2->id_user]);
            }

            // Create 15 Members for this gym
            $members = User::factory()->member()->count(15)->create();
            $totalMembers += 15;

            foreach ($members as $member) {
                // Subscribe & Enroll
                Subscribe::factory()->create([
                    'id_gym' => $gym->id_gym,
                    'id_user' => $member->id_user,
                    'status' => 'active',
                    'subscribe_date' => Carbon::now()->subDays(rand(1, 30)),
                ]);

                $planIdToUse = $plans->isNotEmpty() ? $plans->random()->id_plan : null;

                Enrollment::factory()->create([
                    'id_member' => $member->id_user,
                    'id_gym' => $gym->id_gym,
                    'id_plan' => $planIdToUse,
                    'enrollment_date' => Carbon::now()->subDays(rand(1, 30)),
                    'status' => 'active',
                    'type' => 'standard'
                ]);
            }

            // Create 4 Courses for this gym
            for ($c = 0; $c < 4; $c++) {
                // Select a dynamic number of enrolled members (between 5 and 12)
                $enrolledMembersCount = rand(5, 12);
                $courseMembers = $members->random($enrolledMembersCount);

                $course = Course::factory()->create([
                    'id_gym' => $gym->id_gym,
                    'max_capacity' => $enrolledMembersCount + rand(2, 6),
                    'count' => $enrolledMembersCount,
                ]);
                $totalCourses++;

                // Generate 4 sessions for each course (2 past, 2 future)
                $trainer = $trainers->random();

                // Create enrollments for these course members so they show up in the "My Clients" list for this trainer
                foreach ($courseMembers as $cMember) {
                    Enrollment::updateOrInsert(
                        ['id_member' => $cMember->id_user, 'id_course' => $course->id_course],
                        [
                            'id' => (string) \Illuminate\Support\Str::uuid(),
                            'id_gym' => $gym->id_gym,
                            'enrollment_date' => Carbon::now()->subDays(rand(1, 15)),
                            'status' => 'active',
                            'type' => 'standard',
                            'created_at' => Carbon::now(),
                            'updated_at' => Carbon::now(),
                        ]
                    );
                }
                
                $dates = [
                    Carbon::now()->subDays(14),
                    Carbon::now()->subDays(7),
                    Carbon::now()->addDays(2),
                    Carbon::now()->addDays(9),
                ];

                foreach ($dates as $idx => $date) {
                    $status = $date->isPast() ? 'completed' : 'upcoming';
                    
                    $session = Session::factory()->create([
                        'id_course' => $course->id_course,
                        'id_trainer' => $trainer->id_user,
                        'date_session' => $date,
                        'status' => $status
                    ]);
                    $totalSessions++;

                    // Create attendance for these course members
                    foreach ($courseMembers as $cMember) {
                        // If past, they might be present/absent. If future, they are scheduled 'pending' or 'present' 
                        // The factory generates random present/absent/late
                        $attStatus = $date->isPast() ? (rand(1, 10) > 2 ? 'present' : 'absent') : 'present';

                        Attendance::factory()->create([
                            'id_member' => $cMember->id_user,
                            'id_session' => $session->id_session,
                            'status' => $attStatus
                        ]);
                        $totalAttendances++;
                    }
                }
            }

            // Add some hot payments for revenue views
            \App\Models\Payment::factory()->count(5)->create([
                'id_gym' => $gym->id_gym,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // Call the remaining non-conflicting seeders for auxiliary data
        $this->call([
            ProductSeeder::class,
            OrderSeeder::class,
            NutritionPlanSeeder::class,
            NotificationSeeder::class,
            ReviewSeeder::class,
        ]);

        echo "\n✅ Database seeding successfully orchestrated!\n";
        echo "📊 Total Key Records Created logically:\n";
        echo "   • 4 Gyms\n";
        echo "   • {$totalMembers} Enrolled Members\n";
        echo "   • {$totalCourses} Scoped Courses\n";
        echo "   • {$totalSessions} Linked Sessions\n";
        echo "   • {$totalAttendances} Synced Attendances\n\n";
    }
}
