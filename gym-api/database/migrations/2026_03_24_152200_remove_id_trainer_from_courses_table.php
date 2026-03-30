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
        if (Schema::hasColumn('courses', 'id_trainer')) {
            Schema::table('courses', function (Blueprint $table) {
                // Drop foreign key first if it exists
                $table->dropForeign(['id_trainer']);
                $table->dropColumn('id_trainer');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->foreignUuid('id_trainer')->nullable()->constrained('users', 'id_user')->onDelete('cascade');
        });
    }
};
