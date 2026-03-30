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
        Schema::create('gyms', function (Blueprint $table) {
            $table->uuid('id_gym')->primary();
            $table->string('name');
            $table->string('adress');
            $table->integer('capacity');
            $table->string('open_hour');
            $table->foreignUuid('id_owner')->constrained('users', 'id_user')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('gyms');
        Schema::enableForeignKeyConstraints();
    }
};
