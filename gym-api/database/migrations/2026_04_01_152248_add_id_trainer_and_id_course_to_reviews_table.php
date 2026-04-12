<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->uuid('id_event')->nullable()->change();
            $table->foreignUuid('id_trainer')->nullable()->after('id_event')->constrained('users', 'id_user')->onDelete('cascade');
            $table->foreignUuid('id_course')->nullable()->after('id_trainer')->constrained('courses', 'id_course')->onDelete('cascade');
            $table->foreignUuid('id_session')->nullable()->after('id_course')->constrained('sessions', 'id_session')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->uuid('id_event')->nullable(false)->change();
            $table->dropForeign(['id_trainer']);
            $table->dropForeign(['id_course']);
            $table->dropForeign(['id_session']);
            $table->dropColumn(['id_trainer', 'id_course', 'id_session']);
        });
    }
};
