<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FeedImageSeeder extends Seeder
{
    public function run(): void
    {
        // Event Images
        $eventImages = [
            'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1000',
            'https://images.unsplash.com/photo-1574680094822-ee5930d296ca?q=80&w=1000',
            'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000'
        ];

        // Course Images
        $courseImages = [
            'https://images.unsplash.com/photo-1518611012118-29a8d63ee0c2?q=80&w=1000',
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1000',
            'https://images.unsplash.com/photo-1599058917233-97f394156059?q=80&w=1000'
        ];

        // Product Images
        $productImages = [
            'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=1000',
            'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=1000',
            'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000'
        ];

        // Nutrition Images
        $nutritionImages = [
            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000',
            'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000',
            'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=1000'
        ];

        $events = DB::table('events')->get();
        foreach ($events as $index => $event) {
            DB::table('events')->where('id_event', $event->id_event)->update([
                'image' => $eventImages[$index % count($eventImages)]
            ]);
        }

        $courses = DB::table('courses')->get();
        foreach ($courses as $index => $course) {
            DB::table('courses')->where('id_course', $course->id_course)->update([
                'image' => $courseImages[$index % count($courseImages)]
            ]);
        }

        $products = DB::table('products')->get();
        foreach ($products as $index => $product) {
            DB::table('products')->where('id_product', $product->id_product)->update([
                'image' => $productImages[$index % count($productImages)]
            ]);
        }

        $plans = DB::table('nutrition_plans')->get();
        foreach ($plans as $index => $plan) {
            DB::table('nutrition_plans')->where('id_plan', $plan->id_plan)->update([
                'image' => $nutritionImages[$index % count($nutritionImages)]
            ]);
        }
    }
}
