<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        // Handle CORS at the beginning so it responds to OPTIONS preflights
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);

        // Exclude session middleware from API routes
        $middleware->api(remove: [
            \Illuminate\Session\Middleware\StartSession::class,
        ]);

        // Use custom API authentication middleware
        $middleware->alias([
            'auth.api' => \App\Http\Middleware\ApiAuthenticate::class,
            'role' => \App\Http\Middleware\SuperAdminAccess::class,
            'gym.status' => \App\Http\Middleware\CheckGymStatus::class,
            'subscription.check' => \App\Http\Middleware\CheckSubscription::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
