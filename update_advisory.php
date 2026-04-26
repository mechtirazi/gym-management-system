<?php
require __DIR__ . '/gym-api/vendor/autoload.php';
$app = require_once __DIR__ . '/gym-api/bootstrap/app.php';

use App\Models\User;

$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = User::where('role', 'member')->first();
if ($user) {
    $user->update([
        'nutritionist_advisory' => 'DYNAMIC HUB UPDATE: Your glycogen levels are stabilizing. Maintain current carb loading for the next 48 hours for optimal peak performance.'
    ]);
    echo "USER_SYNC_SUCCESS: Updated advisory for " . $user->email . "\n";
} else {
    echo "USER_SYNC_ERROR: No member found to update.\n";
}
