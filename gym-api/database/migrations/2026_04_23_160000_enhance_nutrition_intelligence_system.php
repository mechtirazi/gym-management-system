<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('nutrition_meals', function (Blueprint $table) {
            $table->uuid('id_meal')->primary();
            $table->uuid('id_plan');
            $table->string('name');
            $table->time('time');
            $table->text('description')->nullable();
            $table->integer('protein')->default(0);
            $table->integer('carbs')->default(0);
            $table->integer('fats')->default(0);
            $table->integer('calories')->default(0);
            $table->timestamps();

            $table->foreign('id_plan')->references('id_plan')->on('nutrition_plans')->onDelete('cascade');
        });

        Schema::create('nutrition_supplements', function (Blueprint $table) {
            $table->uuid('id_supplement')->primary();
            $table->uuid('id_plan');
            $table->string('name');
            $table->string('dosage');
            $table->string('timing');
            $table->string('type')->default('capsule'); // capsule, powder, liquid
            $table->timestamps();

            $table->foreign('id_plan')->references('id_plan')->on('nutrition_plans')->onDelete('cascade');
        });

        Schema::create('meal_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('id_user');
            $table->uuid('id_meal');
            $table->date('log_date');
            $table->boolean('is_completed')->default(false);
            $table->timestamps();

            $table->foreign('id_user')->references('id_user')->on('users')->onDelete('cascade');
            $table->foreign('id_meal')->references('id_meal')->on('nutrition_meals')->onDelete('cascade');
            $table->unique(['id_user', 'id_meal', 'log_date']);
        });

        Schema::create('water_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('id_user');
            $table->integer('amount_ml');
            $table->date('log_date');
            $table->timestamps();

            $table->foreign('id_user')->references('id_user')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('water_logs');
        Schema::dropIfExists('meal_logs');
        Schema::dropIfExists('nutrition_supplements');
        Schema::dropIfExists('nutrition_meals');
    }
};
