<?php
  
  use Illuminate\Database\Migrations\Migration;
  use Illuminate\Database\Schema\Blueprint;
  use Illuminate\Support\Facades\Schema;
  
  return new class extends Migration
  {
      public function up(): void
      {
          Schema::table('courses', function (Blueprint $table) {
              $table->boolean('is_subscription_enabled')->default(false);
              $table->decimal('subscription_price', 8, 2)->nullable();
              $table->boolean('is_recurring')->default(false);
              $table->json('recurring_days')->nullable();
              $table->time('recurring_start_time')->nullable();
              $table->time('recurring_end_time')->nullable();
              $table->integer('recurrence_weeks')->default(0);
          });
      }
  
      public function down(): void
      {
          Schema::table('courses', function (Blueprint $table) {
              $table->dropColumn([
                  'is_subscription_enabled',
                  'subscription_price',
                  'is_recurring',
                  'recurring_days',
                  'recurring_start_time',
                  'recurring_end_time',
                  'recurrence_weeks'
              ]);
          });
      }
  };
