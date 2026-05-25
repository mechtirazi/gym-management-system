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
        $id = $notifiable->getKey();
        $hash = sha1($notifiable->getEmailForVerification());

        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'id'   => $id,
                'hash' => $hash,
            ]
        );

        $frontendVerifyBase = rtrim((string) config('app.frontend_url', 'http://localhost:4200'), '/').'/auth/verify';
        $queryString = parse_url($verifyUrl, PHP_URL_QUERY);
        $frontendUrl = "{$frontendVerifyBase}/{$id}/{$hash}";

        return $queryString ? "{$frontendUrl}?{$queryString}" : $frontendUrl;
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [];
    }
}
