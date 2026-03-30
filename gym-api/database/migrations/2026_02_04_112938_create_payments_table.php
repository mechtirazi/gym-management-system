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
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id_payment')->primary();
            $table->foreignUuid('id_user')->constrained('users', 'id_user')->onDelete('cascade');

            // Optional relations: a payment may be for an order, a gym (membership), or a course
            $table->foreignUuid('id_order')->nullable()->constrained('orders', 'id_order')->onDelete('cascade');
            $table->foreignUuid('id_gym')->nullable()->constrained('gyms', 'id_gym')->onDelete('cascade');
            $table->foreignUuid('id_course')->nullable()->constrained('courses', 'id_course')->onDelete('cascade');

            $table->decimal('amount', 8, 2);
            $table->string('method');
            $table->string('id_transaction');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('payments');
        Schema::enableForeignKeyConstraints();
    }
};
