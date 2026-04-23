<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class NutritionPlan extends Model
{
    use HasFactory, HasUuids;
    use \App\Traits\HasSocialInteractions;

    protected $appends = ['is_liked', 'likes_count', 'comments_count'];

    protected $table = 'nutrition_plans';
    protected $primaryKey = 'id_plan';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id_gym',
        'name',
        'description',
        'image',
        'goal',
        'protein',
        'carbs',
        'fats',
        'calories',
        'score',
        'price',
        'id_nutritionist',
        'id_member',
        'is_active',
        'start_date',
        'end_date'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
        'price' => 'decimal:2'
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function nutritionist()
    {
        return $this->belongsTo(User::class, 'id_nutritionist', 'id_user');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'nutrition_plan_member', 'id_plan', 'id_user')->withTimestamps();
    }

    public function meals()
    {
        return $this->hasMany(NutritionMeal::class, 'id_plan', 'id_plan');
    }

    public function supplements()
    {
        return $this->hasMany(NutritionSupplement::class, 'id_plan', 'id_plan');
    }
}
