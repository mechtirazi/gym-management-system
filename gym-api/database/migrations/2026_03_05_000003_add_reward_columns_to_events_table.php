<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->decimal('reward_amount', 10, 2)
                  ->default(0)
                  ->after('description'); // adjust as needed

            $table->boolean('is_rewarded')
                  ->default(false)
                  ->after('reward_amount');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['reward_amount', 'is_rewarded']);
        });
    }
};