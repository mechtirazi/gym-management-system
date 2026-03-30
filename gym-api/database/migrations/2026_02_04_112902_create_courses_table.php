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
        Schema::create('courses', function (Blueprint $table) {
            $table->uuid('id_course')->primary();
            $table->string('name');
            $table->text('description');
            $table->foreignUuid('id_gym')->constrained('gyms', 'id_gym')->onDelete('cascade');
            $table->decimal('price', 8, 2);
            $table->integer('max_capacity');
            $table->integer('count');
            $table->string('duration');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('courses');
        Schema::enableForeignKeyConstraints();
    }
};
