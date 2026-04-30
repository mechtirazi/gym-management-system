<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    /** @use HasFactory<\Database\Factories\PaymentFactory> */
    use HasFactory;
    use HasUuids;

    protected $primaryKey = 'id_payment';

    public $incrementing = false;

    protected $keyType = 'string';

    public const TYPE_MEMBERSHIP = 'membership';
    public const TYPE_PRODUCT = 'product';
    public const TYPE_COURSE = 'course';
    public const TYPE_EVENT = 'event';
    public const TYPE_NUTRITION = 'nutrition';
    public const TYPE_OTHER = 'other';

    protected $fillable = [
        'id_user',
        'id_gym',
        'id_order',
        'id_course',
        'id_event',
        'id_session',
        'amount',
        'method',
        'type',
        'id_transaction',
        // New fields
        'external_reference',
        'status',
        'is_locked',
        'created_by',
        'finalized_by',
    ];

    protected $casts = [
        'is_locked' => 'boolean',
        'status' => \App\Enums\PaymentStatus::class,
    ];

    protected static function boot()
    {
        parent::boot();

        static::updating(function ($payment) {
            if ($payment->getOriginal('is_locked')) {
                throw new \Exception('Transaction is locked and cannot be modified.');
            }
        });

        static::deleting(function ($payment) {
            if ($payment->is_locked) {
                throw new \Exception('Transaction is locked and cannot be deleted.');
            }
        });
    }

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'id_order', 'id_order');
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function course()
    {
        return $this->belongsTo(Course::class, 'id_course', 'id_course');
    }

    public function event()
    {
        return $this->belongsTo(Event::class, 'id_event', 'id_event');
    }

    public function nutritionPlan()
    {
        return $this->belongsTo(NutritionPlan::class, 'id_nutrition', 'id_nutrition_plan');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by', 'id_user');
    }

    public function finalizedBy()
    {
        return $this->belongsTo(User::class, 'finalized_by', 'id_user');
    }
}
