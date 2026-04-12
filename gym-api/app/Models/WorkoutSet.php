<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkoutSet extends Model
{
    protected $table = 'workout_sets';
    protected $primaryKey = 'id';

    protected $fillable = [
        'id_exercise',
        'set_number',
        'weight',
        'reps',
        'is_completed'
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'weight' => 'float'
    ];

    public function exercise(): BelongsTo
    {
        return $this->belongsTo(WorkoutExercise::class, 'id_exercise', 'id');
    }
}
