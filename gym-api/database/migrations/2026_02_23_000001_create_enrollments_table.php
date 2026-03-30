<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('id_member');
            $table->uuid('id_gym');
            $table->date('enrollment_date');
            $table->timestamps();

            $table->foreign('id_member')
                ->references('id_user')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('id_gym')
                ->references('id_gym')
                ->on('gyms')
                ->onDelete('cascade');

            $table->unique(['id_member', 'id_gym']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('enrollments');
    }
};
