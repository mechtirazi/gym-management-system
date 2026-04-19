<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * Automate session status transitions based on the clock.
 * Requires: php artisan schedule:work
 */
\Illuminate\Support\Facades\Schedule::command('sessions:sync-status')->everyMinute();
