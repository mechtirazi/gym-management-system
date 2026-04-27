<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AttendanceEvent extends Model
{
    /** @use HasFactory<\Database\Factories\AttendanceEventFactory> */
    use HasFactory;
    use HasUuids;

    protected $table = 'attendanceEvent';

    protected $primaryKey = 'id_attendance_event';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * Attendance Event status constants
     */
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_UPCOMING = 'upcoming';

    public const STATUS_ONGOING = 'ongoing';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'id_member',
        'id_event',
        'status',
        'is_winner',
    ];

    // Relationships
    public function member()
    {
        return $this->belongsTo(User::class, 'id_member', 'id_user');
    }

    public function event()
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }
}
