<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('membership_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('id_gym');
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->integer('duration_days');
            $table->text('description')->nullable();
            $table->string('type')->default('standard'); // trial, standard, premium
            $table->timestamps();

            $table->foreign('id_gym')
                ->references('id_gym')
                ->on('gyms')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_plans');
    }
};
