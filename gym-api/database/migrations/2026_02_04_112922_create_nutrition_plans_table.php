<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('nutrition_plans', function (Blueprint $table) {
            $table->uuid('id_plan')->primary();
            $table->string('goal');
            $table->date('start_date');
            $table->date('end_date');
            $table->foreignUuid('id_nutritionist')->constrained('users', 'id_user')->onDelete('cascade');
            $table->foreignUuid('id_member')->constrained('users', 'id_user')->onDelete('cascade');
            $table->decimal('price', 8, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('nutrition_plans');
        Schema::enableForeignKeyConstraints();
    }
};
