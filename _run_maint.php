<?php
use Illuminate\Contracts\Console\Kernel;

if (!isset(
    \['token']
) || \['token'] !== '806e5d031dbf4ff2baff47072c8e970a') {
    http_response_code(403);
    echo "forbidden";
    exit;
}

header('Content-Type: text/plain');

 = require __DIR__.'/../bootstrap/app.php';
 = ->make(Kernel::class);

 = [
    ['passport:keys', ['--force' => true]],
    ['passport:client', ['--personal' => true, '--name' => 'Gym Personal Access Client', '--no-interaction' => true]],
    ['optimize:clear', []],
    ['config:cache', []],
];

foreach ( as [, ]) {
    echo "==  ==\n";
     = ->call(, );
    echo ->output();
    echo "exit=\n\n";
}
