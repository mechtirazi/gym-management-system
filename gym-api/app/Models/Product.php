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
    protected $appends = ['is_liked', 'likes_count', 'comments_count'];

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_gym',
        'name',
        'image',
        'price',
        'stock',
        'category',
    ];

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
