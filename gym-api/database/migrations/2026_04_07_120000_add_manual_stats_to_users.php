<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->integer('manual_calories')->default(0)->after('role');
            $table->integer('manual_protein')->default(0)->after('manual_calories');
            $table->integer('manual_carbs')->default(0)->after('manual_protein');
            $table->integer('manual_fats')->default(0)->after('manual_carbs');
            $table->decimal('manual_water', 5, 2)->default(0)->after('manual_fats');
            $table->decimal('manual_weight', 8, 2)->default(0)->after('manual_water');
            $table->integer('evolution_points')->default(0)->after('manual_weight');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'manual_calories', 
                'manual_protein', 
                'manual_carbs', 
                'manual_fats', 
                'manual_water', 
                'manual_weight',
                'evolution_points'
            ]);
        });
    }
};
