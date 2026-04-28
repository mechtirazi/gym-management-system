<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            // Drop foreign key first because it depends on the unique index in some DB engines
            $table->dropForeign(['user_id']);
            $table->dropUnique(['user_id']);
            
            $table->uuid('id_gym')->nullable()->after('user_id');
            $table->foreign('id_gym')->references('id_gym')->on('gyms')->cascadeOnDelete();
            
            // Re-add user_id foreign key
            $table->foreign('user_id')->references('id_user')->on('users')->cascadeOnDelete();
            
            $table->unique(['user_id', 'id_gym']);
        });
    }

    public function down(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'id_gym']);
            $table->dropForeign(['id_gym']);
            $table->dropForeign(['user_id']);
            
            $table->dropColumn('id_gym');
            
            $table->foreign('user_id')->references('id_user')->on('users')->cascadeOnDelete();
            $table->unique('user_id');
        });
    }
};
