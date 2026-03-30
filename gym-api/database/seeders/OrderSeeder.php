<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 40 orders
        $orders = Order::factory()->count(40)->create();

        // Attach random products to each order
        foreach ($orders as $order) {
            $randomProducts = Product::inRandomOrder()
                ->limit(fake()->numberBetween(1, 5))
                ->get();

            foreach ($randomProducts as $product) {
                $order->products()->attach($product->id_product, [
                    'quantity' => fake()->numberBetween(1, 5),
                ]);
            }
        }

        echo "✓ Created 40 orders with products successfully!\n";
    }
}
