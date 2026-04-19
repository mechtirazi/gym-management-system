<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Gym;

$email = 'crystal05@example.net';
$user = User::where('email', $email)->first();

if (!$user) {
    echo "User not found\n";
    exit;
}

echo "User: {$user->name} (Role: {$user->role})\n";
echo "Allowed Gym IDs: " . json_encode($user->allowedGymIds()->toArray()) . "\n";

$assignedGyms = $user->assignedGyms()->get();
echo "Assigned Gyms Count: " . $assignedGyms->count() . "\n";
foreach($assignedGyms as $g) {
    echo " - Gym: {$g->name} (ID: {$g->id_gym})\n";
}

// Test the specific query that might be failing in TrainerController
$testGymId = $assignedGyms->first()?->id_gym;
if ($testGymId) {
    $exists = $user->assignedGyms()->where('gyms.id_gym', $testGymId)->exists();
    echo "Query check for Gym ID {$testGymId}: " . ($exists ? "EXISTS" : "NOT FOUND") . "\n";
    
    // Try without table alias
    $exists2 = $user->assignedGyms()->where('id_gym', $testGymId)->exists();
    echo "Query check (no alias) for Gym ID {$testGymId}: " . ($exists2 ? "EXISTS" : "NOT FOUND") . "\n";
}
