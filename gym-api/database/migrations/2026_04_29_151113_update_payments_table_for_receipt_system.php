<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Payment;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add new columns
        Schema::table('payments', function (Blueprint $table) {
            $table->string('public_id')->unique()->nullable();
            
            // In MySQL, an auto_increment column must be a primary key.
            // Since id_payment is the primary key, we use a standard bigint and will manage the increment manually in the model.
            $table->bigInteger('sequence')->unique()->nullable(); 
            
            $table->string('external_reference')->nullable();
            $table->string('member_name')->nullable();
            $table->string('email')->nullable();
            $table->string('currency')->default('USD');
            $table->string('status')->default('pending');
            $table->boolean('is_locked')->default(false);
            $table->foreignUuid('created_by')->nullable()->constrained('users', 'id_user')->nullOnDelete();
            $table->foreignUuid('finalized_by')->nullable()->constrained('users', 'id_user')->nullOnDelete();
            
            // 1a. Add new amount column
            $table->bigInteger('amount_cents')->nullable();

            // 1b. Indexes
            // Note: public_id is already unique so it's indexed. 
            // created_at is not standard to index in migration without explicit call, but the prompt asked for it.
            $table->index('created_at');
            $table->index('status');
        });

        // 2. Migrate data safely (chunked + rounded)
        DB::table('payments')->orderBy('id_payment')->chunk(100, function ($payments) {
            foreach ($payments as $payment) {
                DB::table('payments')
                    ->where('id_payment', $payment->id_payment)
                    ->update([
                        'amount_cents' => (int) round($payment->amount * 100)
                    ]);
            }
        });

        // 3. Drop old column and rename
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('amount');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->renameColumn('amount_cents', 'amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['status']);
            
            $table->dropForeign(['created_by']);
            $table->dropForeign(['finalized_by']);
            
            $table->dropColumn([
                'public_id',
                'sequence',
                'external_reference',
                'member_name',
                'email',
                'currency',
                'status',
                'is_locked',
                'created_by',
                'finalized_by'
            ]);
            
            // Revert amount
            $table->decimal('amount_dec', 8, 2)->nullable();
        });

        DB::table('payments')->orderBy('id_payment')->chunk(100, function ($payments) {
            foreach ($payments as $payment) {
                DB::table('payments')
                    ->where('id_payment', $payment->id_payment)
                    ->update([
                        'amount_dec' => $payment->amount / 100
                    ]);
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('amount');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->renameColumn('amount_dec', 'amount');
        });
    }
};

