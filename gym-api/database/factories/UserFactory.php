<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $roles = [
            User::ROLE_SUPER_ADMIN,
            User::ROLE_OWNER,
            User::ROLE_TRAINER,
            User::ROLE_MEMBER,
            User::ROLE_NUTRITIONIST,
            User::ROLE_RECEPTIONIST,
        ];

        return [
            'name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(), // verified by default so existing tests pass
            'password' => 'password123', // Model cast handles hashing
            'role' => fake()->randomElement($roles),
            'phone' => fake()->phoneNumber(),
            'creation_date' => now(),
            'profile_picture' => null,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Create a super admin user.
     */
    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => User::ROLE_SUPER_ADMIN,
        ]);
    }

    /**
     * Create a trainer user.
     */
    public function trainer(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => User::ROLE_TRAINER,
        ]);
    }

    /**
     * Create a member user.
     */
    public function member(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => User::ROLE_MEMBER,
        ]);
    }

    /**
     * Create a nutritionist user.
     */
    public function nutritionist(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => User::ROLE_NUTRITIONIST,
        ]);
    }

    /**
     * Create a gym owner user.
     */
    public function owner(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => User::ROLE_OWNER,
        ]);
    }

    /**
     * Create a receptionist user.
     */
    public function receptionist(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => User::ROLE_RECEPTIONIST,
        ]);
    }
}
