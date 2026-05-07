<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('nutrition_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('id_sender');
            $table->uuid('id_receiver');
            $table->text('text');
            $table->timestamps();

            $table->foreign('id_sender')->references('id_user')->on('users')->onDelete('cascade');
            $table->foreign('id_receiver')->references('id_user')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_messages');
    }
};
