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
        Schema::create('attendanceEvent', function (Blueprint $table) {
            $table->uuid('id_attendance_event')->primary();
            $table->foreignUuid('id_member')->constrained('users', 'id_user')->onDelete('cascade');
            $table->foreignUuid('id_event')->constrained('events', 'id_event')->onDelete('cascade');
            $table->enum('status', ['cancelled', 'upcoming', 'ongoing', 'completed', 'present', 'absent', 'late'])->default('upcoming');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('attendanceEvent');
        Schema::enableForeignKeyConstraints();
    }
};
