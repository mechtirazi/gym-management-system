<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Session;
use App\Models\Attendance;

$sessions = Session::withCount('attendances')->get();
foreach ($sessions as $session) {
    echo "Session {$session->id_session}: {$session->attendances_count} attendances\n";
}

$allAttendances = Attendance::count();
echo "Total attendances in DB: $allAttendances\n";
