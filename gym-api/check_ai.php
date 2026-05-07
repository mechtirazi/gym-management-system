<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

use App\Services\AuraAiService;
use Illuminate\Support\Facades\Config;

// Boot the application to get access to services and config
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$service = new AuraAiService();
$context = [
    'weight' => 80,
    'protein' => 150,
    'water' => 2.5,
    'goal' => 'bulk'
];

echo "Testing POST to httpbin.org...\n";
$url = "https://httpbin.org/post";
$payload = json_encode(['test' => 'data']);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTPBIN RESPONSE (HTTP {$httpCode}): " . substr($response, 0, 500) . "\n";

echo "--- DIAGNOSTIC END ---\n";
