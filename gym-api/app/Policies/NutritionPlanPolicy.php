<?php

namespace App\Policies;

use App\Models\User;
use App\Models\NutritionPlan;

class NutritionPlanPolicy
{
    /**
     * Determine if the user can view any nutrition plans
     */
    public function viewAny(User $user): bool
    {


        // Owner can see plans in their gyms
        if ($user->role === 'owner') {
            return true;
        }

        // Nutritionist can see their plans
        if ($user->role === 'nutritionist') {
            return true;
        }

        // Receptionist and Trainer can see plans in their assigned gyms
        if ($user->role === 'receptionist' || $user->role === User::ROLE_TRAINER) {
            return true;
        }

        // Member can see their own plans
        if ($user->role === 'member') {
            return true;
        }

        return false;
    }

    /**
     * Determine if the user can view a nutrition plan
     */
    public function view(User $user, NutritionPlan $nutritionPlan): bool
    {

        // Member can view if they are assigned to the plan (through legacy column OR pivot table)
        if ($user->role === 'member') {
            return $nutritionPlan->id_member === $user->id_user || 
                   $nutritionPlan->members()->where('users.id_user', $user->id_user)->exists();
        }

        // Nutritionist can only view their own plans
        if ($user->role === 'nutritionist') {
            return $nutritionPlan->id_nutritionist === $user->id_user;
        }

        // Owner can view plans for members in their gyms (through subscription)
        if ($user->role === 'owner') {
            return true; // Filtered by gym context in controller
        }

        // Receptionist can view plans in their assigned gyms
        if ($user->role === 'receptionist') {
            return true; // Filtered by gym context in controller
        }

        return false;
    }

    /**
     * Determine if the user can create a nutrition plan
     */
    public function create(User $user): bool
    {
        // Only super admin and nutritionist can create plans
        return $user->role === 'nutritionist';
    }

    /**
     * Determine if the user can update a nutrition plan
     */
    public function update(User $user, NutritionPlan $nutritionPlan): bool
    {


        // Nutritionist can only update their own plans
        if ($user->role === 'nutritionist') {
            return $nutritionPlan->id_nutritionist === $user->id_user;
        }

        // Owner can update plans in their gyms
        if ($user->role === 'owner') {
            return true; // Filtered by gym context in controller
        }

        // Receptionist can update plans in their assigned gyms
        if ($user->role === 'receptionist') {
            return true; // Filtered by gym context in controller
        }

        return false;
    }

    /**
     * Determine if the user can delete a nutrition plan
     */
    public function delete(User $user, NutritionPlan $nutritionPlan): bool
    {


        // Nutritionist can only delete their own plans
        if ($user->role === 'nutritionist') {
            return $nutritionPlan->id_nutritionist === $user->id_user;
        }

        // Owner can delete plans in their gyms
        if ($user->role === 'owner') {
            return true; // Filtered by gym context in controller
        }

        return false;
    }
}
