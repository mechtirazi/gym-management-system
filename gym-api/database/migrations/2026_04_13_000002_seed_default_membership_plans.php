<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $gyms = DB::table('gyms')->get();

        foreach ($gyms as $gym) {
            DB::table('membership_plans')->insert([
                [
                    'id' => Str::uuid(),
                    'id_gym' => $gym->id_gym,
                    'name' => 'Discovery Tier',
                    'price' => 9.99,
                    'duration_days' => 3,
                    'description' => '3-Day access spike to test facility synchronization.',
                    'type' => 'trial',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => Str::uuid(),
                    'id_gym' => $gym->id_gym,
                    'name' => 'Vanguard Tier',
                    'price' => 49.99,
                    'duration_days' => 30,
                    'description' => '30-Day standard facility access and base protocols.',
                    'type' => 'standard',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => Str::uuid(),
                    'id_gym' => $gym->id_gym,
                    'name' => 'Elite Tier',
                    'price' => 99.99,
                    'duration_days' => 90,
                    'description' => '90-Day full-node access including VIP recovery tech.',
                    'type' => 'premium',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('membership_plans')->truncate();
    }
};
