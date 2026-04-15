<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    /** @use HasFactory<\Database\Factories\ReviewFactory> */
    use HasFactory;
    use HasUuids;

    protected $primaryKey = 'review_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_user',
        'id_gym',
        'id_event',
        'id_trainer',
        'id_course',
        'id_session',
        'rating',
        'comment',
        'review_date',
        'ai_sentiment_score',
        'ai_category',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function event()
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'id_trainer', 'id_user');
    }

    public function course()
    {
        return $this->belongsTo(Course::class, 'id_course', 'id_course');
    }

    public function session()
    {
        return $this->belongsTo(Session::class, 'id_session', 'id_session');
    }
}
