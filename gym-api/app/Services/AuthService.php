<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthService
{
    /**
     * Register a new user and issue access token
     */
    public function register(array $data): array
    {
        try {
            // Set default role if not provided
            $data['role'] = $data['role'] ?? User::ROLE_MEMBER;

            // Set creation date
            $data['creation_date'] = now();

            // Set default status to pending
            $data['status'] = 'pending';

            // Create user (email_verified_at is null by default).
            $user = User::create($data);

            $emailResult = $this->sendVerificationEmail($user);

            return [
                'success'              => true,
                'user'                 => $user,
                'email_sent'           => $emailResult['sent'],
                'mail_error'           => $emailResult['error'],
                'email_verification'   => $emailResult['sent']
                    ? 'A verification email has been sent to your email address.'
                    : 'Account created, but verification email could not be sent right now. Please use "Resend Verification Email".',
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Authenticate user and issue access token
     */
    public function login(string $email, string $password): array
    {
        try {
            // Find user by email
            $user = User::where('email', $email)->first();

            // Check if user exists and password is correct
            if (! $user || ! Hash::check($password, $user->password)) {
                return [
                    'success' => false,
                    'message' => 'Invalid credentials',
                ];
            }

            // Block login if email is not verified
            if (! $user->hasVerifiedEmail()) {
                return [
                    'success'              => false,
                    'message'              => 'Your email address is not verified.',
                    'email_not_verified'   => true,
                ];
            }

            // Generate access token
            $token = $user->createToken('auth_token', ['*'])->accessToken;

            return [
                'success' => true,
                'user'    => $user,
                'token'   => $token,
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Resend the email verification notification.
     */
    public function resendVerification(string $email): array
    {
        try {
            $user = User::where('email', $email)->first();

            if (! $user) {
                return [
                    'success' => false,
                    'message' => 'User not found.',
                ];
            }

            if ($user->hasVerifiedEmail()) {
                return [
                    'success' => false,
                    'message' => 'Email is already verified.',
                ];
            }

            $emailResult = $this->sendVerificationEmail($user);
            if (! $emailResult['sent']) {
                return [
                    'success' => false,
                    'message' => 'Could not send verification email: ' . ($emailResult['error'] ?? 'unknown error'),
                ];
            }

            return [
                'success' => true,
                'message' => 'Verification email resent successfully.',
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    private function sendVerificationEmail(User $user): array
    {
        try {
            // Send synchronously (bypass queue) to surface errors immediately
            $notification = new VerifyEmailNotification();
            $notification->onConnection('sync');
            $user->notify($notification);

            return ['sent' => true, 'error' => null];
        } catch (\Throwable $e) {
            Log::error('Failed to send verification email', [
                'user_id'        => $user->getKey(),
                'email'          => $user->email,
                'mailer'         => config('mail.default'),
                'resend_key_set' => !empty(config('services.resend.key')),
                'error'          => $e->getMessage(),
                'trace'          => $e->getTraceAsString(),
            ]);

            return ['sent' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get current authenticated user
     */
    public function getUser(User $user): array
    {
        try {
            return [
                'success' => true,
                'user' => $user,
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(User $user): array
    {
        try {
            // Revoke the current token
            /** @var \Laravel\Passport\Token|null $token */
            $token = $user->token();
            if ($token) {
                $token->revoke();
            }

            return [
                'success' => true,
                'message' => 'Logged out successfully',
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Find or create user for social login
     */
    public function findOrCreateUser(string $provider, $socialUser): array
    {
        try {
            // Check if user already exists by provider and provider_id
            $user = User::where('provider', $provider)
                ->where('provider_id', $socialUser->getId())
                ->first();

            if (! $user) {
                // Check if user exists by email (might have registered normally before)
                $user = User::where('email', $socialUser->getEmail())->first();

                if ($user) {
                    // Update existing user with social info
                    $user->update([
                        'provider' => $provider,
                        'provider_id' => $socialUser->getId(),
                    ]);
                } else {
                    // Create new user
                    $names = explode(' ', $socialUser->getName() ?? 'Social User');
                    $firstName = $names[0] ?? 'Social';
                    $lastName = $names[1] ?? 'User';

                    $user = User::create([
                        'name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $socialUser->getEmail(),
                        'provider' => $provider,
                        'provider_id' => $socialUser->getId(),
                        'role' => User::ROLE_MEMBER, // Default role
                        'creation_date' => now(),
                        'email_verified_at' => now(),
                    ]);
                }
            }

            // Generate access token
            $token = $user->createToken('auth_token', ['*'])->accessToken;

            return [
                'success' => true,
                'user' => $user,
                'token' => $token,
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Refresh access token
     */
    public function refresh(User $user): array
    {
        try {
            // Revoke old token
            /** @var \Laravel\Passport\Token|null $token */
            $token = $user->token();
            if ($token) {
                $token->revoke();
            }

            // Create new token
            $token = $user->createToken('auth_token', ['*'])->accessToken;

            return [
                'success' => true,
                'token' => $token,
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Format user response
     */
    public function formatUserResponse(User $user): array
    {
        $context = $user->primaryGymContext();
        
        return array_merge($user->only([
            'id_user',
            'name',
            'last_name',
            'email',
            'role',
            'phone',
            'profile_picture',
            'status',
            'nutritionist_advisory',
            'platform_tier',
            'platform_upgrade_expires_at',
        ]), [
            'gym_id' => $context['id_gym'] ?? null,
            'gym_status' => $context['status'] ?? 'active',
            'gym_suspension_reason' => $context['suspension_reason'] ?? null,
        ]);
    }

    /**
     * Format user with creation date response
     */
    public function formatUserWithDateResponse(User $user): array
    {
        $context = $user->primaryGymContext();

        return array_merge($user->only([
            'id_user',
            'name',
            'last_name',
            'email',
            'role',
            'phone',
            'creation_date',
            'profile_picture',
            'status',
            'nutritionist_advisory',
            'platform_tier',
            'platform_upgrade_expires_at',
        ]), [
            'gym_id' => $context['id_gym'] ?? null,
            'gym_status' => $context['status'] ?? 'active',
            'gym_suspension_reason' => $context['suspension_reason'] ?? null,
        ]);
    }
}
