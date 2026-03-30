<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Unsecured Routes
    |--------------------------------------------------------------------------
    |
    | Passport routes that should not require authorization to prevent
    | infinite loops when setting up keys during initial install.
    |
    */

    'unsecured_routes' => [
        'health*',
    ],

];
