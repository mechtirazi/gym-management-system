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
        Schema::table('payments', function (Blueprint $column) {
            $column->uuid('id_session')->nullable()->after('id_course');
            
            // Re-adding foreign key if needed, assuming sessions table exists
            $column->foreign('id_session')->references('id_session')->on('sessions')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $column) {
            $column->dropForeign(['id_session']);
            $column->dropColumn('id_session');
        });
    }
};
