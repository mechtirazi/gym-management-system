<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Course;
use App\Models\User;

$trainer = User::where('role', 'trainer')->first();
if (!$trainer) {
    echo "No trainer found\n";
    exit;
}

echo "Trainer: {$trainer->name} {$trainer->last_name} (ID: {$trainer->id_user})\n";

// Get all gyms this trainer is assigned to
$assignedGyms = $trainer->assignedGyms;
echo "Assigned Gyms Count: " . $assignedGyms->count() . "\n";
foreach ($assignedGyms as $gym) {
    echo " - Gym: {$gym->name} (ID: {$gym->id_gym})\n";
}

$courses = Course::with('gym')
    ->whereHas('sessions', function ($q) use ($trainer) {
        $q->where('id_trainer', $trainer->id_user);
    })
    ->get();

echo "Total Courses Found: " . $courses->count() . "\n";
foreach ($courses as $c) {
    echo "Course: {$c->name} (ID: {$c->id_course}) | Gym: {$c->gym->name} (ID: {$c->id_gym})\n";
}
