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
        Schema::table('events', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->default(0)->after('max_participants');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->uuid('id_event')->nullable()->after('id_session');
            $table->foreign('id_event')->references('id_event')->on('events')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('price');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['id_event']);
            $table->dropColumn('id_event');
        });
    }
};
