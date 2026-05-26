<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmailService
{
    /**
     * Send an email via SendGrid HTTP API.
     * Works on Railway (no SMTP port blocking).
     */
    public static function send(string $to, string $subject, string $htmlBody): bool
    {
        $key  = env('SENDGRID_API_KEY');
        $from = env('MAIL_FROM_ADDRESS', 'noreply@sendgrid.net');
        $name = env('MAIL_FROM_NAME', 'GymManagement');

        if (!$key) {
            Log::error('EmailService: SENDGRID_API_KEY is not set.');
            return false;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $key,
            'Content-Type'  => 'application/json',
        ])->post('https://api.sendgrid.com/v3/mail/send', [
            'personalizations' => [['to' => [['email' => $to]]]],
            'from'    => ['email' => $from, 'name' => $name],
            'subject' => $subject,
            'content' => [['type' => 'text/html', 'value' => $htmlBody]],
        ]);

        if (!$response->successful()) {
            Log::error('EmailService: SendGrid error', [
                'status' => $response->status(),
                'body'   => $response->body(),
                'to'     => $to,
            ]);
            return false;
        }

        Log::info('EmailService: Email sent', ['to' => $to, 'subject' => $subject]);
        return true;
    }

    /**
     * Send password reset OTP email.
     */
    public static function sendPasswordReset(string $to, int $code): bool
    {
        return self::send(
            $to,
            'Your Password Reset Code',
            '
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
                <h2 style="color:#1e293b;">Password Reset Request</h2>
                <p>You requested to reset your password. Use the following code:</p>
                <div style="font-size:36px;font-weight:bold;letter-spacing:8px;background:#e2e8f0;padding:16px;border-radius:6px;text-align:center;color:#0f172a;">' . $code . '</div>
                <p style="margin-top:16px;color:#64748b;font-size:13px;">This code expires in 15 minutes. If you did not request this, ignore this email.</p>
            </div>'
        );
    }

    /**
     * Send email verification link.
     */
    public static function sendVerification(string $to, string $name, string $verificationUrl): bool
    {
        return self::send(
            $to,
            'Verify Your Email Address',
            '
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
                <h2 style="color:#1e293b;">Hello, ' . htmlspecialchars($name) . '!</h2>
                <p>Welcome to GymManagement! Please verify your email address to activate your account.</p>
                <div style="text-align:center;margin:24px 0;">
                    <a href="' . $verificationUrl . '" style="background:#10b981;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">Verify Email Address</a>
                </div>
                <p style="color:#64748b;font-size:13px;">This link expires in 60 minutes. If you did not create an account, ignore this email.</p>
            </div>'
        );
    }
}
