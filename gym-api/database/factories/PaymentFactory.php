<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Order;
use App\Models\Gym;
use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $gym = Gym::inRandomOrder()->first() ?? Gym::factory()->create();
        
        $relationType = $this->faker->randomElement(['membership', 'product', 'course', 'other']);
        
        $id_order = null;
        $id_course = null;
        $type = $relationType;

        if ($relationType === 'product') {
            $id_order = Order::inRandomOrder()->first()?->id_order;
        } elseif ($relationType === 'course') {
            $id_course = Course::where('id_gym', $gym->id_gym)->inRandomOrder()->first()?->id_course;
        }

        // Random date in the last year
        $createdAt = $this->faker->dateTimeBetween('-11 months', 'now');

        return [
            'id_user' => User::inRandomOrder()->first()?->id_user ?? User::factory(),
            'id_gym' => $gym->id_gym,
            'id_order' => $id_order,
            'id_course' => $id_course,
            'amount' => $this->faker->numberBetween(20, 1000),
            'method' => $this->faker->randomElement(['credit_card', 'cash', 'bank_transfer']),
            'type' => $type,
            'id_transaction' => $this->faker->bothify('TRX-####-????'),
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];
    }
}
