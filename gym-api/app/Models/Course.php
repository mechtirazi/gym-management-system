<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;
    use \Illuminate\Database\Eloquent\Concerns\HasUuids;
    use \App\Traits\HasSocialInteractions;

    protected $primaryKey = 'id_course';
    protected $appends = ['is_liked', 'likes_count', 'comments_count'];
    public $incrementing = false;
    protected $keyType = 'string';
    
    protected $fillable = [
        'name',
        'description',
        'image',
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
}
