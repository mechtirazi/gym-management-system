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
            if (!Schema::hasColumn('gyms', 'platform_subscription_type')) {
                $table->string('platform_subscription_type')->nullable()->after('plan');
            }
            if (!Schema::hasColumn('gyms', 'platform_subscription_price')) {
                $table->decimal('platform_subscription_price', 10, 2)->default(0)->after('platform_subscription_type');
            }
            if (!Schema::hasColumn('gyms', 'subscription_expires_at')) {
                $table->timestamp('subscription_expires_at')->nullable()->after('platform_subscription_price');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gyms', function (Blueprint $table) {
            $table->dropColumn(['platform_subscription_type', 'platform_subscription_price', 'subscription_expires_at']);
        });
    }
};
