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
        Schema::table('gyms', function (Blueprint $table) {
            $table->string('open_mon_fri')->nullable()->after('phone')->default('06:00 - 22:00');
            $table->string('open_sat')->nullable()->after('open_mon_fri')->default('08:00 - 20:00');
            $table->string('open_sun')->nullable()->after('open_sat')->default('08:00 - 16:00');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gyms', function (Blueprint $table) {
            $table->dropColumn(['open_mon_fri', 'open_sat', 'open_sun']);
        });
    }
};
