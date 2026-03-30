<?php

namespace Database\Seeders;

use App\Models\Payment;
use Illuminate\Database\Seeder;

class PaymentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 200 payments for historical analytical data
        Payment::factory()->count(200)->create();

        echo "✓ Created 200 analytical payments successfully!\n";
    }
}
