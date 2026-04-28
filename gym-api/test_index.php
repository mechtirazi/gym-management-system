<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $service = new \App\Services\NotificationService();
    // Simulate Super Admin
    $user = \App\Models\User::where('role', 'super_admin')->first();
    if ($user) {
        $notifs = $service->getAllScoped($user);
        
        $response = response()->json([
            'success' => true,
            'data' => $notifs,
            'message' => 'Notification retrieved successfully',
        ], 200);

        echo "Success\n";
    }
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
} catch (\Error $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
}
