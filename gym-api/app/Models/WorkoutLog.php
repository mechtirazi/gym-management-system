<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkoutLog extends Model
{
    protected $table = 'workout_logs';
    protected $primaryKey = 'id';
    
    protected $fillable = [
        'id_member',
        'name',
        'workout_date'
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_member', 'id_user');
    }

    public function exercises(): HasMany
    {
        return $this->hasMany(WorkoutExercise::class, 'id_workout', 'id');
    }
}
