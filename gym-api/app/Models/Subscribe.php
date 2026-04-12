<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Carbon;
use Illuminate\Database\Eloquent\Model;

class Subscribe extends Model
{
    /** @use HasFactory<\Database\Factories\SubscribeFactory> */
    use HasFactory;
    use HasUuids;

    protected $table = 'subscribe';

    protected $primaryKey = 'id_subscribe';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $appends = ['end_date'];

    public function getEndDateAttribute()
    {
        if (!$this->subscribe_date)
            return null;
        return Carbon::parse($this->subscribe_date)->addDays(30)->toDateString();
    }

    /**
     * Subscribe status constants
     */
    public const STATUS_INACTIVE = 'inactive';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'id_gym',
        'id_user',
        'status',
        'subscribe_date',
    ];

    // Relationships
    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}
