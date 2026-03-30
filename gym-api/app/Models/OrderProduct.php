<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class OrderProduct extends Pivot
{
    use HasUuids;

    protected $table = 'order_product';

    public $incrementing = false;

    protected $keyType = 'string';
}
