<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Build the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage())
            ->subject('Verify Your Email Address - Gym App')
            ->greeting('Hello, '.$notifiable->name.'!')
            ->line('Welcome to Gym App! Please verify your email address to activate your account and start using all features.')
            ->action('Verify Email Address', $verificationUrl)
            ->line('This verification link will expire in '.Config::get('auth.verification.expire', 60).' minutes.')
            ->line('If you did not create an account, no further action is required.')
            ->salutation('Best regards, The Gym App Team');
    }

    /**
     * Generate the email verification URL.
     */
    protected function verificationUrl(object $notifiable): string
    {
        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'id'   => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        $frontendUrl = 'http://localhost:4200/auth/verify';
        
        // Find the route path segment to replace it with the frontend URL
        $backendBase = route('verification.verify', ['id' => 'ID', 'hash' => 'HASH']);
        $backendBase = str_replace(['ID', 'HASH'], '', $backendBase);
        $backendBase = rtrim($backendBase, '/');

        return str_replace($backendBase, $frontendUrl, $verifyUrl);
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [];
    }
}
