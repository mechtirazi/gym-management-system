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
        Schema::create('sessions', function (Blueprint $table) {
            $table->uuid('id_session')->primary();
            $table->date('date_session');
            $table->time('start_time');
            $table->time('end_time');
            $table->foreignUuid('id_course')->constrained('courses', 'id_course')->onDelete('cascade');
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'upcoming', 'ongoing'])->default('upcoming');
            $table->foreignUuid('id_trainer')->constrained('users', 'id_user')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('sessions');
        Schema::enableForeignKeyConstraints();
    }
};
