<?php

use App\Models\User;
use App\Models\Attendance;
use App\Models\WorkoutLog;
use Carbon\Carbon;

$userId = '019d821d-f3dc-73d8-b192-2d2200096489';
$gymId = '019d821e-021c-711f-b726-2754c462f631';

$user = User::find($userId);
if (!$user) {
    die("User not found\n");
}

echo "Seeding data for {$user->name}...\n";

// 1. Biometrics
$user->update([
    'manual_calories' => 2400,
    'manual_protein' => 160,
    'manual_carbs' => 280,
    'manual_fats' => 75,
    'manual_water' => 3.2,
    'manual_weight' => 78.5,
    'evolution_points' => 1250, // Enough to be a "Protocol Master"
]);

// 2. Attendances (Check-ins) - 15 sessions over the last 30 days
for ($i = 0; $i < 15; $i++) {
    Attendance::create([
        'id_member' => $userId,
        'status' => 'present',
        'created_at' => Carbon::now()->subDays($i * 2)->subHours(rand(1, 12)),
    ]);
}

// 3. Workout Logs (Progress Trends)
$exercises = [
    ['name' => 'Bench Press', 'category' => 'chest', 'base_weight' => 60],
    ['name' => 'Squats', 'category' => 'legs', 'base_weight' => 80],
    ['name' => 'Pull Ups', 'category' => 'back', 'base_weight' => 0],
    ['name' => 'Overhead Press', 'category' => 'shoulders', 'base_weight' => 40],
];

foreach ($exercises as $exInfo) {
    // Create 4 sessions for each exercise to show a trend
    for ($week = 0; $week < 4; $week++) {
        $log = WorkoutLog::create([
            'id_member' => $userId,
            'name' => 'Pulse Session: ' . ucfirst($exInfo['category']),
            'workout_date' => Carbon::now()->subWeeks($week)->subDays(rand(0, 3)),
        ]);

        $ex = $log->exercises()->create([
            'exercise_name' => $exInfo['name'],
            'order' => 0,
        ]);

        // Each session has 3 sets with increasing weight (progressive overload)
        for ($set = 1; $set <= 3; $set++) {
            $ex->sets()->create([
                'set_number' => $set,
                'weight' => $exInfo['base_weight'] + ($week * 2.5) + ($set * 5),
                'reps' => 10 - $set,
            ]);
        }
    }
}

echo "Successfully synchronized 1250 evolution points, 15 attendance nodes, and 16 workout protocols.\n";
