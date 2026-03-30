<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('wallet_id')
                  ->constrained('wallets')
                  ->cascadeOnDelete();

            $table->enum('type', ['credit', 'debit', 'bonus', 'refund']);
            $table->decimal('amount', 10, 2);
            $table->string('description')->nullable();

            // polymorphic reference (event, order, etc.)
            $table->string('reference_type')->nullable();
            $table->uuid('reference_id')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};