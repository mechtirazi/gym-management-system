<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MembershipPlan extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id_gym',
        'name',
        'price',
        'duration_days',
        'description',
        'type'
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'id_plan');
    }
}
