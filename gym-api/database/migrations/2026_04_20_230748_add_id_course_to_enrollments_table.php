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
        if (!Schema::hasColumn('enrollments', 'id_course')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Drop foreign keys first to allow dropping the unique index they depend on
                $table->dropForeign(['id_member']);
                $table->dropForeign(['id_gym']);
                
                // Drop legacy unique constraint to allow multiple enrollments (gym + courses) per user
                $table->dropUnique(['id_member', 'id_gym']);

                $table->char('id_course', 36)->nullable()->after('id_plan');
                $table->foreign('id_course')->references('id_course')->on('courses')->onDelete('cascade');
                
                // Prevent double-enrollment data bugs as recommended
                $table->unique(['id_member', 'id_course'], 'enrollment_member_course_unique');

                // Re-add removed foreign keys
                $table->foreign('id_member')->references('id_user')->on('users')->onDelete('cascade');
                $table->foreign('id_gym')->references('id_gym')->on('gyms')->onDelete('cascade');
            });
        }

        // Backfill Enrollments from existing Course Payments
        $payments = DB::table('payments')
            ->whereNotNull('id_course')
            ->get();

        foreach ($payments as $payment) {
            DB::table('enrollments')->updateOrInsert(
                ['id_member' => $payment->id_user, 'id_course' => $payment->id_course],
                [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'id_gym' => $payment->id_gym,
                    'enrollment_date' => $payment->created_at ?? now(),
                    'status' => 'active',
                    'type' => 'standard',
                    'created_at' => $payment->created_at ?? now(),
                    'updated_at' => $payment->updated_at ?? now(),
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropUnique('enrollment_member_course_unique');
            $table->dropForeign(['id_course']);
            $table->dropColumn('id_course');
        });
    }
};
