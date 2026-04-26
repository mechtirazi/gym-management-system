<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class NutritionSupplement extends Model
{
    use HasFactory, HasUuids;

    protected $primaryKey = 'id_supplement';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id_plan',
        'name',
        'dosage',
        'timing',
        'type',
    ];

    public function plan()
    {
        return $this->belongsTo(NutritionPlan::class, 'id_plan', 'id_plan');
    }
}
