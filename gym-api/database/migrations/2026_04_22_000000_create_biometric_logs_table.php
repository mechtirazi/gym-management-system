<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_logs', function (Blueprint $table) {
            $table->id();
            $table->string('id_member');
            $table->decimal('weight', 8, 2);
            $table->decimal('body_fat', 5, 2)->nullable();
            $table->integer('calories')->nullable();
            $table->text('notes')->nullable();
            $table->date('log_date');
            $table->timestamps();

            $table->foreign('id_member')->references('id_user')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_logs');
    }
};
