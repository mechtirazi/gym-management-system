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
        if (Schema::hasTable('courses') && !Schema::hasColumn('courses', 'duration_unit')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->string('duration_unit')->default('min')->after('duration');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('courses', 'duration_unit')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->dropColumn('duration_unit');
            });
        }
    }
};
