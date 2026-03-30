<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    // ------------------------------------------------------------------ //
    //  REGISTRATION                                                        //
    // ------------------------------------------------------------------ //

    #[\PHPUnit\Framework\Attributes\Test]
    public function register_sends_verification_email_and_does_not_return_token(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'John',
            'last_name'             => 'Doe',
            'email'                 => 'john@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['user'],
            ])
            // No token returned until email is verified
            ->assertJsonMissing(['access_token']);

        // Notification was sent to the new user
        $user = User::where('email', 'john@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function registration_only_sends_one_verification_email(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', [
            'name'                  => 'Jane',
            'last_name'             => 'Smith',
            'email'                 => 'jane@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $user = User::where('email', 'jane@example.com')->first();
        Notification::assertSentToTimes($user, VerifyEmailNotification::class, 1);
    }

    // ------------------------------------------------------------------ //
    //  LOGIN GATE                                                          //
    // ------------------------------------------------------------------ //

    #[\PHPUnit\Framework\Attributes\Test]
    public function unverified_user_cannot_login(): void
    {
        $user = User::factory()->unverified()->create([
            'email'    => 'unverified@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'unverified@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success'            => false,
                'email_not_verified' => true,
            ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function verified_user_can_login(): void
    {
        $user = User::factory()->create([
            'email'              => 'verified@example.com',
            'password'           => 'password123',
            'email_verified_at'  => now(),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'verified@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['user', 'access_token', 'token_type'],
            ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function login_still_rejects_wrong_password(): void
    {
        User::factory()->create([
            'email'             => 'user@example.com',
            'password'          => 'password123',
            'email_verified_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'user@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    // ------------------------------------------------------------------ //
    //  EMAIL VERIFICATION ENDPOINT                                         //
    // ------------------------------------------------------------------ //

    #[\PHPUnit\Framework\Attributes\Test]
    public function valid_signed_link_marks_email_as_verified_and_returns_token(): void
    {
        $user = User::factory()->unverified()->create();

        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id'   => $user->getKey(),
                'hash' => sha1($user->email),
            ]
        );

        // Strip the base URL so we only hit the API path
        $path = parse_url($verifyUrl, PHP_URL_PATH).'?'.parse_url($verifyUrl, PHP_URL_QUERY);

        $response = $this->getJson($path);

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => ['user', 'access_token', 'token_type'],
            ]);

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function expired_signed_link_returns_400(): void
    {
        $user = User::factory()->unverified()->create();

        // Generate a link that expired in the past
        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->subMinutes(1),
            [
                'id'   => $user->getKey(),
                'hash' => sha1($user->email),
            ]
        );

        $path = parse_url($verifyUrl, PHP_URL_PATH).'?'.parse_url($verifyUrl, PHP_URL_QUERY);

        $response = $this->getJson($path);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid or expired verification link.',
            ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function tampered_hash_returns_400(): void
    {
        $user = User::factory()->unverified()->create();

        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id'   => $user->getKey(),
                'hash' => 'totally-wrong-hash',
            ]
        );

        $path = parse_url($verifyUrl, PHP_URL_PATH).'?'.parse_url($verifyUrl, PHP_URL_QUERY);

        $response = $this->getJson($path);

        $response->assertStatus(400)
            ->assertJson(['success' => false]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function already_verified_email_returns_200_with_already_verified_message(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id'   => $user->getKey(),
                'hash' => sha1($user->email),
            ]
        );

        $path = parse_url($verifyUrl, PHP_URL_PATH).'?'.parse_url($verifyUrl, PHP_URL_QUERY);

        $response = $this->getJson($path);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Email already verified.',
            ]);
    }

    // ------------------------------------------------------------------ //
    //  RESEND VERIFICATION                                                 //
    // ------------------------------------------------------------------ //

    #[\PHPUnit\Framework\Attributes\Test]
    public function resend_verification_sends_new_email_to_unverified_user(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create([
            'email' => 'unverified@example.com',
        ]);

        $response = $this->postJson('/api/auth/resend-verification', [
            'email' => 'unverified@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Verification email resent successfully.',
            ]);

        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function resend_verification_rejects_already_verified_email(): void
    {
        Notification::fake();

        User::factory()->create([
            'email'             => 'verified@example.com',
            'email_verified_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/resend-verification', [
            'email' => 'verified@example.com',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Email is already verified.',
            ]);

        Notification::assertNothingSent();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function resend_verification_returns_400_for_unknown_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/auth/resend-verification', [
            'email' => 'nobody@example.com',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'User not found.',
            ]);

        Notification::assertNothingSent();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function resend_verification_validates_email_format(): void
    {
        $response = $this->postJson('/api/auth/resend-verification', [
            'email' => 'not-an-email',
        ]);

        $response->assertStatus(422);
    }
}
