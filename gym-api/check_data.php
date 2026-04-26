<?php

use App\Models\NutritionPlan;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $count = NutritionPlan::count();
    echo "Total Nutrition Plans: $count\n";
    if ($count > 0) {
        $plan = NutritionPlan::first();
        echo "First Plan Name: " . $plan->name . "\n";
    } else {
        echo "NO PLANS FOUND IN DB.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
