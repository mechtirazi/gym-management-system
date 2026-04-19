<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Session;
use Illuminate\Support\Facades\Gate;

$user = User::where('email', 'crystal05@example.net')->first();
echo "User: {$user->name} (Role: {$user->role})\n";

$canViewSessions = Gate::forUser($user)->allows('viewAny', Session::class);
echo "Can viewAny sessions? " . ($canViewSessions ? "YES" : "NO") . "\n";

$canViewAnalytics = Gate::forUser($user)->allows('viewAnalytics', User::class); // Just checking a dummy gate
echo "Can viewAnalytics? " . ($canViewAnalytics ? "YES" : "NO") . "\n";

// Check specifically for trainer middleware
$roleMiddleware = new \App\Http\Middleware\SuperAdminAccess();
$request = new \Illuminate\Http\Request();
$request->setUserResolver(function() use ($user) { return $user; });

try {
    $response = $roleMiddleware->handle($request, function() { return response("OK"); }, 'trainer');
    echo "Middleware role:trainer result: " . $response->getContent() . " (Status: " . $response->getStatusCode() . ")\n";
} catch (\Exception $e) {
    echo "Middleware role:trainer error: " . $e->getMessage() . "\n";
}
