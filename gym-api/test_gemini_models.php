<?php
$apiKey = 'AIzaSyCGOvU6fEr3whHX_GTDYgM9BeF3Nt-JEuo';
$ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models?key={$apiKey}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
print_r(json_decode($res, true));
