<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiometricLog extends Model
{
    protected $table = 'biometric_logs';
    
    protected $fillable = [
        'id_member',
        'weight',
        'body_fat',
        'calories',
        'notes',
        'log_date'
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_member', 'id_user');
    }
}
