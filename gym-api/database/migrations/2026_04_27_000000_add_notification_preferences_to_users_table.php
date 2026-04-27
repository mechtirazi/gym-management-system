<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notification_email')->default(true);
            $table->boolean('notification_sms')->default(false);
            $table->boolean('notification_marketing')->default(true);
            $table->boolean('notification_app_updates')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'notification_email',
                'notification_sms',
                'notification_marketing',
                'notification_app_updates',
            ]);
        });
    }
};
