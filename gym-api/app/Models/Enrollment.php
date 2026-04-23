<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Carbon;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;
    use HasUuids;

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $appends = ['end_date', 'start_date'];

    protected $fillable = [
        'id_member',
        'id_gym',
        'id_plan',
        'id_course',
        'enrollment_date',
        'status',
        'type',
    ];

    public function getEndDateAttribute()
    {
        if (!$this->enrollment_date)
            return null;

        // Dynamic logic based on plan or type
        if ($this->plan) {
            $days = $this->plan->duration_days;
        } else {
            $days = ($this->type === 'premium') ? 90 : 30;
        }

        return Carbon::parse($this->enrollment_date)->addDays($days)->toDateString();
    }

    public function plan()
    {
        return $this->belongsTo(MembershipPlan::class, 'id_plan');
    }

    public function getStartDateAttribute()
    {
        return $this->enrollment_date;
    }

    // Relationships
    public function member()
    {
        return $this->belongsTo(User::class, 'id_member', 'id_user');
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function course()
    {
        return $this->belongsTo(Course::class, 'id_course', 'id_course');
    }

    /**
     * Get the latest payment specifically for this course enrollment.
     */
    public function latestCoursePayment()
    {
        return $this->hasOne(Payment::class, 'id_course', 'id_course')
            ->where('id_user', $this->id_member)
            ->latest();
    }
}
