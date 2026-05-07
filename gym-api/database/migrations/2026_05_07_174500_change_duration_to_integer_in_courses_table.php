<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Sanitize and prepare duration value and unit
        DB::table('courses')->get()->each(function ($course) {
            $raw = strtolower($course->duration);
            $value = (int) filter_var($raw, FILTER_SANITIZE_NUMBER_INT);
            if (!$value) $value = 60;

            $unit = 'min';
            if (str_contains($raw, 'hour')) $unit = 'hour';
            elseif (str_contains($raw, 'day')) $unit = 'day';
            elseif (str_contains($raw, 'week')) $unit = 'week';
            elseif (str_contains($raw, 'month')) $unit = 'month';
            
            DB::table('courses')
                ->where('id_course', $course->id_course)
                ->update(['duration' => $value]);
        });

        Schema::table('courses', function (Blueprint $table) {
            // Change duration to integer
            $table->integer('duration')->change();
            
            // Add duration_unit if it doesn't exist
            if (!Schema::hasColumn('courses', 'duration_unit')) {
                $table->string('duration_unit')->default('min')->after('duration');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('duration')->change();
            $table->dropColumn('duration_unit');
        });
    }
};
