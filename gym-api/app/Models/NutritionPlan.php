<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class NutritionPlan extends Model
{
    /** @use HasFactory<\Database\Factories\NutritionPlanFactory> */
    use HasFactory;
    use HasUuids;

    protected $primaryKey = 'id_plan';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_gym',
        'name',
        'description',
        'goal',
        'protein',
        'carbs',
        'fats',
        'calories',
        'score',
        'is_active',
        'start_date',
        'end_date',
        'id_nutritionist',
        'id_member',
        'price',
    ];

    // Relationships
    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function nutritionist()
    {
        return $this->belongsTo(User::class, 'id_nutritionist', 'id_user');
    }

    public function member()
    {
        return $this->belongsTo(User::class, 'id_member', 'id_user');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'nutrition_plan_member', 'id_plan', 'id_user');
    }
}
