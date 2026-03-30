<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            // use UUID primary key
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')
                  ->constrained('users', 'id_user')
                  ->cascadeOnDelete();

            // the balance field for storing credit
            $table->decimal('balance', 10, 2)->default(0);
            $table->timestamps();

            // one wallet per user
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};