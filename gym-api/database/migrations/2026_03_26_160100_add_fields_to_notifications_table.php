<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $hasTitle = Schema::hasColumn('notifications', 'title');
        $hasType = Schema::hasColumn('notifications', 'type');
        $hasIsRead = Schema::hasColumn('notifications', 'is_read');

        Schema::table('notifications', function (Blueprint $table) use ($hasTitle, $hasType, $hasIsRead) {
            if (! $hasTitle) {
                $table->string('title')->nullable()->after('id_notification');
            }

            if (! $hasType) {
                $table->string('type')->default('info')->after('text');
            }

            if (! $hasIsRead) {
                $table->boolean('is_read')->default(false)->after('id_user');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $hasTitle = Schema::hasColumn('notifications', 'title');
        $hasType = Schema::hasColumn('notifications', 'type');
        $hasIsRead = Schema::hasColumn('notifications', 'is_read');

        Schema::table('notifications', function (Blueprint $table) use ($hasTitle, $hasType, $hasIsRead) {
            if ($hasTitle || $hasType || $hasIsRead) {
                $columns = [];
                if ($hasTitle) {
                    $columns[] = 'title';
                }
                if ($hasType) {
                    $columns[] = 'type';
                }
                if ($hasIsRead) {
                    $columns[] = 'is_read';
                }

                if (! empty($columns)) {
                    $table->dropColumn($columns);
                }
            }
        });
    }
};
