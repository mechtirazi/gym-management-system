<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkoutExercise extends Model
{
    protected $table = 'workout_exercises';
    protected $primaryKey = 'id';

    protected $fillable = [
        'id_workout',
        'exercise_name',
        'order'
    ];

    public function workout(): BelongsTo
    {
        return $this->belongsTo(WorkoutLog::class, 'id_workout', 'id');
    }

    public function sets(): HasMany
    {
        return $this->hasMany(WorkoutSet::class, 'id_exercise', 'id');
    }
}
