<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;
    use HasUuids;
    use \App\Traits\HasSocialInteractions;

    protected $primaryKey = 'id_event';

    protected $appends = ['is_liked', 'likes_count', 'comments_count'];

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'title',
        'description',
        'image',
        'reward_amount',
        'is_rewarded',
        'start_date',
        'end_date',
        'max_participants',
        'id_gym',
    ];

    // Relationships
    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'id_event', 'id_event');
    }

    public function attendances()
    {
        return $this->hasMany(AttendanceEvent::class, 'id_event', 'id_event');
    }
}
