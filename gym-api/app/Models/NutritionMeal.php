<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class NutritionMeal extends Model
{
    use HasFactory, HasUuids;

    protected $primaryKey = 'id_meal';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id_plan',
        'name',
        'time',
        'description',
        'protein',
        'carbs',
        'fats',
        'calories',
    ];

    public function plan()
    {
        return $this->belongsTo(NutritionPlan::class, 'id_plan', 'id_plan');
    }

    public function logs()
    {
        return $this->hasMany(MealLog::class, 'id_meal', 'id_meal');
    }
}
