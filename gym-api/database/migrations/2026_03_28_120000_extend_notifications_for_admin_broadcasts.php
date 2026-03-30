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
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['id_user']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->uuid('id_user')->nullable()->change();
            $table->boolean('is_read')->default(false)->after('id_user');
            $table->index(['id_user', 'created_at'], 'notifications_user_created_at_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->foreign('id_user')
                ->references('id_user')
                ->on('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['id_user']);
            $table->dropIndex('notifications_user_created_at_index');
            $table->dropColumn('is_read');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->uuid('id_user')->nullable(false)->change();
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->foreign('id_user')
                ->references('id_user')
                ->on('users')
                ->cascadeOnDelete();
        });
    }
};
