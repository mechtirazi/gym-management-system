<?php

$defaultOrigins = array_filter([
    env('FRONTEND_URL'),
    'http://localhost:4200',
    'https://gym-ui-production.up.railway.app',
]);

$allowedOrigins = array_values(array_unique(array_filter(array_map(
    static fn (string $origin): string => rtrim(trim($origin), '/'),
    explode(',', env('CORS_ALLOWED_ORIGINS', implode(',', $defaultOrigins)))
), static fn (string $origin): bool => $origin !== '')));

$allowedOriginPatterns = array_values(array_unique(array_filter(array_map(
    static fn (string $pattern): string => trim($pattern),
    explode(',', env('CORS_ALLOWED_ORIGIN_PATTERNS', '#^https://gym-ui(?:-[a-z0-9-]+)?\\.up\\.railway\\.app$#'))
), static fn (string $pattern): bool => $pattern !== '')));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'oauth/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => $allowedOriginPatterns,

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
