<?php

namespace Database\Seeders;

use App\Models\NutritionPlan;
use App\Models\User;
use Illuminate\Database\Seeder;

class NutritionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear old data first (pivot table then plans)
        \DB::table('nutrition_plan_member')->delete();
        NutritionPlan::query()->delete();
        echo "🗑️  Cleared old nutrition plans and member assignments.\n";

        $members = User::where('role', 'member')->get();

        if ($members->isEmpty()) {
            echo "⚠️ No members found! Please seed users first.\n";
            return;
        }

        // Create 20 nutrition plans and assign random members to each
        NutritionPlan::factory()->count(20)->create()->each(function ($plan) use ($members) {
            // Attach 1 to 3 random members to each plan
            $plan->members()->attach(
                $members->random(rand(1, 3))->pluck('id_user')->toArray()
            );
        });

        echo "✓ Created 20 nutrition plans and assigned members successfully!\n";
    }
}
