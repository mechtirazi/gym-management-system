<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workout_logs', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->uuid('id_member');
            $blueprint->string('name')->nullable();
            $blueprint->timestamp('workout_date')->useCurrent();
            $blueprint->timestamps();

            $blueprint->foreign('id_member')->references('id_user')->on('users')->onDelete('cascade');
        });

        Schema::create('workout_exercises', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('id_workout');
            $blueprint->string('exercise_name');
            $blueprint->integer('order')->default(0);
            $blueprint->timestamps();

            $blueprint->foreign('id_workout')->references('id')->on('workout_logs')->onDelete('cascade');
        });

        Schema::create('workout_sets', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->unsignedBigInteger('id_exercise');
            $blueprint->integer('set_number');
            $blueprint->decimal('weight', 8, 2)->default(0);
            $blueprint->integer('reps')->default(0);
            $blueprint->boolean('is_completed')->default(true);
            $blueprint->timestamps();

            $blueprint->foreign('id_exercise')->references('id')->on('workout_exercises')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workout_sets');
        Schema::dropIfExists('workout_exercises');
        Schema::dropIfExists('workout_logs');
    }
};
