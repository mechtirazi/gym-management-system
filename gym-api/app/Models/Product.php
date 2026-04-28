<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;
    use HasUuids;
    use \App\Traits\HasSocialInteractions;

    protected $primaryKey = 'id_product';
    protected $appends = ['is_liked', 'likes_count', 'comments_count', 'discounted_price'];

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_gym',
        'name',
        'description',
        'image',
        'price',
        'stock',
        'category',
        'discount_percentage',
    ];

    public function getDiscountedPriceAttribute()
    {
        if ($this->discount_percentage > 0) {
            return $this->price * (1 - ($this->discount_percentage / 100));
        }
        return $this->price;
    }

    // Relationships
    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }

    public function orders()
    {
        return $this->belongsToMany(
            Order::class,
            'order_product',
            'id_product',
            'id_order'
        )->using(OrderProduct::class)->withPivot('quantity')->withTimestamps();
    }
}
