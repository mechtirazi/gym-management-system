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
        // 1. Create the pivot table for multi-member support
        Schema::create('nutrition_plan_member', function (Blueprint $table) {
            $table->id();
            $table->uuid('id_plan');
            $table->uuid('id_user');
            
            $table->foreign('id_plan')->references('id_plan')->on('nutrition_plans')->onDelete('cascade');
            $table->foreign('id_user')->references('id_user')->on('users')->onDelete('cascade');
            
            $table->timestamps();
        });

        // 2. Make the single id_member nullable for transition
        Schema::table('nutrition_plans', function (Blueprint $table) {
            $table->uuid('id_member')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nutrition_plan_member');
        
        Schema::table('nutrition_plans', function (Blueprint $table) {
            $table->uuid('id_member')->nullable(false)->change();
        });
    }
};
