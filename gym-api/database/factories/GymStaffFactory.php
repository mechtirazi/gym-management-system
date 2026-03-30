<?php

namespace Database\Factories;

use App\Models\Gym;
use App\Models\User;
use App\Models\GymStaff;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\GymStaff>
 */
class GymStaffFactory extends Factory
{
    protected $model = GymStaff::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_gym' => Gym::inRandomOrder()->first()?->id_gym ?? Gym::factory(),
            'id_user' => User::whereIn('role', [
                User::ROLE_TRAINER,
                User::ROLE_NUTRITIONIST,
                User::ROLE_RECEPTIONIST,
            ])->inRandomOrder()->first()?->id_user ?? User::factory()->trainer(),
        ];
    }
}
