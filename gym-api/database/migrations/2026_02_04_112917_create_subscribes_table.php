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
        Schema::create('subscribe', function (Blueprint $table) {
            $table->uuid('id_subscribe')->primary();
            $table->foreignUuid('id_gym')->constrained('gyms', 'id_gym')->onDelete('cascade');
            $table->foreignUuid('id_user')->constrained('users', 'id_user')->onDelete('cascade');
            $table->enum('status', ['inactive', 'active', 'expired', 'cancelled', 'paused'])->default('inactive');
            $table->date('subscribe_date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('subscribes');
        Schema::enableForeignKeyConstraints();
    }
};
