<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 25 products
        Product::factory()->count(25)->create();

        echo "✓ Created 25 products successfully!\n";
    }
}
