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
        if (!Schema::hasColumn('gym_staff', 'status')) {
            Schema::table('gym_staff', function (Blueprint $table) {
                $table->string('status')->default('active')->after('id_user');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gym_staff', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
