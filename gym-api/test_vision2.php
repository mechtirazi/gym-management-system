<?php

$ch = curl_init('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, 1);
$payload = [
    'inputs' => base64_encode(file_get_contents('https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg'))
];
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "Status: $http\n";
echo "Body: $res\n";
