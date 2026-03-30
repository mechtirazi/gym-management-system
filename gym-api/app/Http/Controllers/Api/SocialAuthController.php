<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Services\AuthService;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Redirect to the social provider
     */
    public function redirectToProvider($provider)
    {
        if (! in_array($provider, ['google', 'facebook', 'github'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid provider',
            ], 400);
        }

        return Socialite::driver($provider)->stateless()->redirect();
    }

    /**
     * Handle provider callback
     */
   public function handleProviderCallback($provider)
{
    try {
        if (!in_array($provider, ['google', 'facebook', 'github'])) {
            return response()->json(['success' => false, 'message' => 'Invalid provider'], 400);
        }

        // 1. STATLESS is already good for performance
        $socialUser = Socialite::driver($provider)->stateless()->user();
        $result = $this->authService->findOrCreateUser($provider, $socialUser);

        if (!$result['success']) {
            return response()->json([
                'success' => false, 
                'message' => 'Error handling social login: ' . $result['message']
            ], 500);
        }

        // 2. SLIM PAYLOAD: Only send essential data in the URL
        // Parsing a massive JSON string in the URL is slow for the browser.
        $userData = [
            'id' => $result['user']->id,
            'name' => $result['user']->name,
            'email' => $result['user']->email,
            'role' => $result['user']->role,
        ];
        
        $token = $result['token'];
        $userJson = base64_encode(json_encode($userData)); // Base64 is faster to parse than URL-encoded JSON

        // 3. PRELOAD HEADER: Tells the browser to start preparing the Angular Dashboard
        // while the redirect is still happening. This significantly improves LCP.
        return redirect("http://localhost:4200/auth/callback?token={$token}&u={$userJson}")
            ->header('Link', '<http://localhost:4200/dashboard>; rel=prefetch');

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error during social authentication: ' . $e->getMessage()
        ], 500);
    }
    }
}
