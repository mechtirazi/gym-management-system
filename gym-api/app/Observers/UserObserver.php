<?php

namespace App\Observers;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Automatically send verification email if user is not verified
        // (Social login users are auto-verified in the controller, so this won't trigger for them)
        if (!$user->email_verified_at) {
            $user->notify(new VerifyEmailNotification());
        }
    }
}
