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
            $table->foreignUuid('id_gym')->nullable()->after('id_user')->constrained('gyms', 'id_gym')->onDelete('cascade');
            $table->foreignUuid('id_event')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['id_gym']);
            $table->dropColumn('id_gym');
            $table->foreignUuid('id_event')->nullable(false)->change();
        });
    }
};
