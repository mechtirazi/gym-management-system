<?php

namespace App\Http\Controllers\Api;

use App\Models\Gym;
use App\Models\Course;
use App\Models\Event;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class SearchController extends Controller
{
    /**
     * Perform a global search across Zenith resources.
     */
    public function globalSearch(Request $request)
    {
        $query = $request->input('query');
        if (!$query || strlen($query) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $results = [];

        // 1. Search Gyms
        $gyms = Gym::where('name', 'like', "%{$query}%")
            ->orWhere('description', 'like', "%{$query}%")
            ->take(3)
            ->get(['id_gym', 'name', 'picture']);
        
        foreach ($gyms as $gym) {
            $results[] = [
                'id' => $gym->id_gym,
                'name' => $gym->name,
                'category' => 'Gyms',
                'type' => 'Gym',
                'icon' => 'apartment',
                'image' => $gym->picture,
                'route' => '/member/gyms/' . $gym->id_gym
            ];
        }

        // 2. Search Courses
        $courses = Course::where('name', 'like', "%{$query}%")
            ->take(3)
            ->get(['id_course', 'name', 'id_gym']);
        
        foreach ($courses as $course) {
            $results[] = [
                'id' => $course->id_course,
                'name' => $course->name,
                'category' => 'Training',
                'type' => 'Course',
                'icon' => 'fitness_center',
                'route' => '/member/gyms/' . $course->id_gym
            ];
        }

        // 3. Search Products
        $products = Product::where('name', 'like', "%{$query}%")
            ->take(3)
            ->get(['id_product', 'name', 'image']);
        
        foreach ($products as $product) {
            $results[] = [
                'id' => $product->id_product,
                'name' => $product->name,
                'category' => 'Nutrition',
                'type' => 'Product',
                'icon' => 'shopping_basket',
                'image' => $product->image,
                'route' => '/member/products'
            ];
        }

        // 4. Search Trainers
        $trainers = User::where('role', 'trainer')
            ->where(function($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('last_name', 'like', "%{$query}%");
            })
            ->take(3)
            ->get(['id_user', 'name', 'last_name', 'profile_picture']);
        
        foreach ($trainers as $trainer) {
            $results[] = [
                'id' => $trainer->id_user,
                'name' => $trainer->name . ' ' . $trainer->last_name,
                'category' => 'Staff',
                'type' => 'Trainer',
                'icon' => 'person',
                'image' => $trainer->profile_picture,
                'route' => '/member/trainers/' . $trainer->id_user
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $results
        ]);
    }
}
