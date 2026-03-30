<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Support\Facades\Hash;

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

            // Create user (email_verified_at is null by default)
            $user = User::create($data);

            // Send verification email
            $user->notify(new VerifyEmailNotification());

            return [
                'success'              => true,
                'user'                 => $user,
                'email_verification'   => 'A verification email has been sent to your email address.',
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

            $user->notify(new VerifyEmailNotification());

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
            $user->token()->revoke();

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
            $user->token()->revoke();

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
        return $user->only([
            'id_user',
            'name',
            'last_name',
            'email',
            'role',
            'phone',
            'profile_picture',
        ]);
    }

    /**
     * Format user with creation date response
     */
    public function formatUserWithDateResponse(User $user): array
    {
        return $user->only([
            'id_user',
            'name',
            'last_name',
            'email',
            'role',
            'phone',
            'creation_date',
            'profile_picture',
        ]);
    }
}
