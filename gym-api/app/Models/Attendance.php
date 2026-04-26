<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    /** @use HasFactory<\Database\Factories\AttendanceFactory> */
    use HasFactory;
    use HasUuids;

    protected $table = 'attendance';

    protected $primaryKey = 'id_attendance';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * Attendance status constants
     */
    public const STATUS_ABSENT = 'absent';

    public const STATUS_PRESENT = 'present';

    public const STATUS_LATE = 'late';

    public const STATUS_PENDING = 'pending';

    protected $fillable = [
        'id_member',
        'id_session',
        'status',
    ];

    // Relationships
    public function member()
    {
        return $this->belongsTo(User::class, 'id_member', 'id_user');
    }

    public function session()
    {
        return $this->belongsTo(Session::class, 'id_session', 'id_session');
    }
}
