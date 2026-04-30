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
        Schema::table('payments', function (Blueprint $table) {
            // Drop foreign key first if it exists
            $table->dropForeign(['id_product']);
            
            // Drop columns
            $table->dropColumn([
                'id_product',
                'public_id',
                'sequence',
                'currency',
                'member_name',
                'email'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignUuid('id_product')->nullable()->constrained('products', 'id_product')->nullOnDelete();
            $table->string('public_id')->unique()->nullable();
            $table->bigInteger('sequence')->unique()->nullable();
            $table->string('currency')->default('TND');
            $table->string('member_name')->nullable();
            $table->string('email')->nullable();
        });
    }
};
