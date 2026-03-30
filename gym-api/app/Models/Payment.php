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
    public const TYPE_NUTRITION = 'nutrition';
    public const TYPE_OTHER = 'other';

    protected $fillable = [
        'id_user',
        'id_gym',
        'id_order',
        'id_course',
        'amount',
        'method',
        'type',
        'id_transaction',
    ];

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
}
