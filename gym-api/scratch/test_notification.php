<?php

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Load Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Find a trainer and a member
$trainer = User::where('role', User::ROLE_TRAINER)->first();
$member = User::where('role', User::ROLE_MEMBER)->first();

if (!$trainer || !$member) {
    echo "Could not find trainer or member in database.\n";
    exit(1);
}

echo "Trainer: {$trainer->email} ({$trainer->id_user})\n";
echo "Member: {$member->email} ({$member->id_user})\n";

// Act as trainer
Auth::login($trainer);

try {
    echo "Attempting to create notification...\n";
    $notification = Notification::create([
        'title' => 'Test Notification',
        'text' => 'This is a test notification from scratch script.',
        'type' => 'info',
        'id_user' => $member->id_user,
        'id_sender' => $trainer->id_user,
    ]);
    echo "Notification created successfully! ID: {$notification->id_notification}\n";
} catch (\Exception $e) {
    echo "FAILED to create notification.\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
