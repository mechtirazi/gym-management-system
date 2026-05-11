<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Payment;
use Carbon\Carbon;

$monthStart = Carbon::now()->startOfMonth();
$today = Carbon::today();

echo "Checking Revenue for this month (from $monthStart):\n";

$stats = Payment::selectRaw('status, sum(amount) as total, count(*) as count')
    ->where('created_at', '>=', $monthStart)
    ->groupBy('status')
    ->get();

foreach ($stats as $stat) {
    echo "Status: {$stat->status->value}, Count: {$stat->count}, Total: {$stat->total} TND\n";
}

$totalNoFilter = Payment::where('created_at', '>=', $monthStart)->sum('amount');
echo "\nTotal (no status filter): $totalNoFilter TND\n";

$finalized = Payment::where('created_at', '>=', $monthStart)
    ->where('status', \App\Enums\PaymentStatus::Finalized)
    ->sum('amount');
echo "Total (Finalized only): $finalized TND\n";

echo "\nLatest 5 payments this month:\n";
$latest = Payment::where('created_at', '>=', $monthStart)
    ->orderBy('created_at', 'desc')
    ->take(5)
    ->get();

foreach ($latest as $p) {
    echo "ID: {$p->id_payment}, Amount: {$p->amount}, Status: {$p->status->value}, Created: {$p->created_at}\n";
}
