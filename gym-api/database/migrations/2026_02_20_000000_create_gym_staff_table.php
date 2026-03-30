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
        Schema::create('gym_staff', function (Blueprint $table) {
            $table->uuid('id_gym_staff')->primary();
            $table->foreignUuid('id_gym')->constrained('gyms', 'id_gym')->onDelete('cascade');
            $table->foreignUuid('id_user')->constrained('users', 'id_user')->onDelete('cascade');
            $table->timestamps();

            // Ensure a user is only assigned to a gym once
            $table->unique(['id_gym', 'id_user']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gym_staff');
    }
};
