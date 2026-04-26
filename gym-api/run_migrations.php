<?php

use Illuminate\Support\Facades\Artisan;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Starting migration...\n";
    $exitCode = Artisan::call('migrate', ['--force' => true]);
    echo "Migration finished with exit code: $exitCode\n";
    echo Artisan::output();
} catch (\Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "\n";
}
