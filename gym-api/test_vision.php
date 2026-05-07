<?php

$ch = curl_init('https://text.pollinations.ai/');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, 1);
$payload = [
    'messages' => [
        [
            'role' => 'user',
            'content' => [
                ['type' => 'text', 'text' => 'Describe this image.'],
                ['type' => 'image_url', 'image_url' => ['url' => 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg']]
            ]
        ]
    ]
];
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "Status: $http\n";
echo "Body: $res\n";
