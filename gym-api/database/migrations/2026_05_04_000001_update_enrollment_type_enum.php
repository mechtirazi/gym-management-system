<?php
  
  use Illuminate\Database\Migrations\Migration;
  use Illuminate\Database\Schema\Blueprint;
  use Illuminate\Support\Facades\Schema;
  use Illuminate\Support\Facades\DB;
  
  return new class extends Migration
  {
      public function up(): void
      {
          // We use raw SQL because modifying ENUM columns via Blueprint can be tricky in some Laravel versions
          DB::statement("ALTER TABLE enrollments MODIFY COLUMN type ENUM('standard', 'premium', 'trial', 'subscription') DEFAULT 'standard'");
      }
  
      public function down(): void
      {
          DB::statement("ALTER TABLE enrollments MODIFY COLUMN type ENUM('standard', 'premium', 'trial') DEFAULT 'standard'");
      }
  };
