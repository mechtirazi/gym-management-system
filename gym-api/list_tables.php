<?php

use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $tables = DB::select('SHOW TABLES');
    foreach ($tables as $table) {
        foreach ($table as $key => $value) {
            echo $value . "\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
