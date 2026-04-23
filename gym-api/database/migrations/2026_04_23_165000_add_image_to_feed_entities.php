<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('image')->nullable()->after('description');
        });
        Schema::table('courses', function (Blueprint $table) {
            $table->string('image')->nullable()->after('description');
        });
        Schema::table('products', function (Blueprint $table) {
            $table->string('image')->nullable()->after('name');
        });
        Schema::table('nutrition_plans', function (Blueprint $table) {
            $table->string('image')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) { $table->dropColumn('image'); });
        Schema::table('courses', function (Blueprint $table) { $table->dropColumn('image'); });
        Schema::table('products', function (Blueprint $table) { $table->dropColumn('image'); });
        Schema::table('nutrition_plans', function (Blueprint $table) { $table->dropColumn('image'); });
    }
};
