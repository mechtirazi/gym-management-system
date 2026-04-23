<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    /** @use HasFactory<\Database\Factories\CourseFactory> */
    use HasFactory;
    use \Illuminate\Database\Eloquent\Concerns\HasUuids;

    protected $primaryKey = 'id_course';
    public $incrementing = false;
    protected $keyType = 'string';
    
    protected $fillable = [
        'name',
        'description',
        'id_gym',
        'price',
        'max_capacity',
        'count',
        'duration',
    ];

    // Relationships
    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function sessions()
    {
        return $this->hasMany(Session::class, 'id_course', 'id_course');
    }

    public function enrolledMembers()
    {
        return $this->belongsToMany(User::class, 'enrollments', 'id_course', 'id_member')
            ->withPivot('status')
            ->withTimestamps();
    }
}
