<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Gym;

$gyms = Gym::all();
foreach($gyms as $g) {
    echo "ID: {$g->id_gym} | Name: {$g->name} | Status: {$g->status}\n";
}
