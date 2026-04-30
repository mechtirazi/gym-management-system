<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Session extends Model
{
    /** @use HasFactory<\Database\Factories\SessionFactory> */
    use HasFactory;
    use HasUuids;
 
    protected $appends = ['attendances_count'];

    protected $primaryKey = 'id_session';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * Session status constants
     */
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_UPCOMING = 'upcoming';

    public const STATUS_ONGOING = 'ongoing';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'date_session',
        'start_time',
        'end_time',
        'id_course',
        'status',
        'id_trainer',
        'coaching_notes',
    ];

    // Relationships
    public function course()
    {
        return $this->belongsTo(Course::class, 'id_course', 'id_course');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'id_trainer', 'id_user');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'id_session', 'id_session');
    }

    public function getAttendancesCountAttribute()
    {
        return $this->attendances()->count();
    }
}
