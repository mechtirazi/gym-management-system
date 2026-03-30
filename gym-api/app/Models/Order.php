<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    /** @use HasFactory<\Database\Factories\OrderFactory> */
    use HasFactory;
    use HasUuids;

    protected $primaryKey = 'id_order';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * Order status constants
     */
    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'order_date',
        'status',
        'total_amount',
        'id_member',
    ];

    // Relationships
    public function products()
    {
        return $this->belongsToMany(
            Product::class,
            'order_product',
            'id_order',
            'id_product'
        )->using(OrderProduct::class)->withPivot('quantity', 'price')->withTimestamps();
    }

    public function member()
    {
        return $this->belongsTo(User::class, 'id_member', 'id_user');
    }
}
