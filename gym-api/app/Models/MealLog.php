<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MealLog extends Model
{
    use HasUuids;

    protected $primaryKey = 'id_log';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id_user',
        'id_meal',
        'log_date',
        'is_completed',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function meal()
    {
        return $this->belongsTo(NutritionMeal::class, 'id_meal', 'id_meal');
    }
}
