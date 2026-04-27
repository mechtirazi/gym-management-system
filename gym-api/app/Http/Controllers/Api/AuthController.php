<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Register a new user
     */
    public function register(RegisterRequest $request)
    {
        try {
            $data = $request->validated();
            
            // Security: Enforce member role for public registration
            // Unless the request is made by an authenticated owner or super_admin
            $currentUser = auth('api')->user();
            if (!$currentUser || !in_array($currentUser->role, ['owner', 'super_admin'])) {
                $data['role'] = 'member';
            } else {
                // If an owner/admin is calling this, ensure we have a role or default to member
                $data['role'] = $data['role'] ?? 'member';
            }

            $result = $this->authService->register($data);

            if (! $result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error registering user: '.$result['message'],
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Registration successful. '.$result['email_verification'],
                'data'    => [
                    'user' => $this->authService->formatUserResponse($result['user']),
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error registering user: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Login user
     */
    public function login(LoginRequest $request)
    {
        try {
            $result = $this->authService->login(
                $request->validated('email'),
                $request->validated('password')
            );

            if (! $result['success']) {
                // Email not verified – tell the client explicitly
                if (! empty($result['email_not_verified'])) {
                    return response()->json([
                        'success'            => false,
                        'message'            => $result['message'],
                        'email_not_verified' => true,
                    ], 403);
                }

                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 401);
            }

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'data'    => [
                    'user'         => $this->authService->formatUserResponse($result['user']),
                    'access_token' => $result['token'],
                    'token_type'   => 'Bearer',
                ],
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error logging in: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify email address via signed URL
     */
    public function verify(Request $request, string $id, string $hash)
    {
        try {
            // Validate the signed URL
            if (! URL::hasValidSignature($request)) {
                if (!$request->expectsJson()) {
                    return redirect("http://localhost:4200/auth/verify/{$id}/{$hash}?" . $request->getQueryString());
                }
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired verification link.',
                ], 400);
            }

            $user = User::findOrFail($id);

            // Validate hash
            if (! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
                if (!$request->expectsJson()) {
                    return redirect("http://localhost:4200/auth/verify/{$id}/{$hash}?" . $request->getQueryString());
                }
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid verification link.',
                ], 400);
            }

            if ($user->hasVerifiedEmail()) {
                if (!$request->expectsJson()) {
                    return redirect("http://localhost:4200/auth/verify/{$id}/{$hash}?" . $request->getQueryString());
                }
                return response()->json([
                    'success' => true,
                    'message' => 'Email already verified.',
                ], 200);
            }

            $user->markEmailAsVerified();
            $user->update(['status' => 'active']);

            // Issue a token so the user can log in right away
            $token = $user->createToken('auth_token', ['*'])->accessToken;

            $responseData = [
                'success' => true,
                'message' => 'Email verified successfully! You can now log in.',
                'data'    => [
                    'user'         => $this->authService->formatUserResponse($user),
                    'access_token' => $token,
                    'token_type'   => 'Bearer',
                ],
            ];

            if (!$request->expectsJson()) {
                $frontendUrl = 'http://localhost:4200/auth/verify';
                $queryString = $request->getQueryString();
                return redirect("{$frontendUrl}/{$id}/{$hash}?{$queryString}");
            }

            return response()->json($responseData, 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error verifying email: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resend email verification link
     */
    public function resendVerification(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        try {
            $result = $this->authService->resendVerification($request->email);

            $statusCode = $result['success'] ? 200 : 400;

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
            ], $statusCode);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error resending verification email: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get authenticated user info
     */
    public function me(Request $request)
    {
        try {
            $user = $request->user();
            $result = $this->authService->getUser($user);

            if (! $result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 500);
            }

            return response()->json([
                'success' => true,
                'data' => $this->authService->formatUserWithDateResponse($result['user']),
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching user: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        try {
            $user = $request->user();
            $result = $this->authService->logout($user);

            if (! $result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => $result['message'],
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error logging out: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Refresh access token
     */
    public function refresh(Request $request)
    {
        try {
            $user = $request->user();
            $result = $this->authService->refresh($user);

            if (! $result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Token refreshed successfully',
                'data' => [
                    'access_token' => $result['token'],
                    'token_type' => 'Bearer',
                ],
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error refreshing token: '.$e->getMessage(),
            ], 500);
        }
    }
}
