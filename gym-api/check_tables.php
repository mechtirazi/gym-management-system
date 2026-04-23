<?php

use Illuminate\Support\Facades\Schema;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$tables = [
    'nutrition_plans',
    'nutrition_meals',
    'nutrition_supplements',
    'meal_logs',
    'water_logs'
];

echo "Checking tables...\n";
foreach ($tables as $table) {
    if (Schema::hasTable($table)) {
        echo "Table '$table' EXISTS.\n";
        $columns = Schema::getColumnListing($table);
        echo "Columns: " . implode(', ', $columns) . "\n";
    } else {
        echo "Table '$table' DOES NOT EXIST.\n";
    }
}
