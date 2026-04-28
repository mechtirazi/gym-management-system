<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$notifs = \App\Models\Notification::where('type', 'support_ticket')->whereNull('id_sender')->get();
foreach ($notifs as $n) {
    if (preg_match('/Support Request from (.*)/', $n->title, $m)) {
        $name = trim($m[1]);
        $parts = explode(' ', $name);
        $first = $parts[0];
        $u = \App\Models\User::where('name', 'like', $first . '%')->first();
        if ($u) {
            $n->id_sender = $u->id_user;
            $n->save();
            echo "Updated " . $n->id_notification . " with sender " . $u->id_user . "\n";
        }
    }
}
echo "Done!\n";
