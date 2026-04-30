<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    /** @use HasFactory<\Database\Factories\NotificationFactory> */
    use HasFactory;
    use HasUuids;

    protected $primaryKey = 'id_notification';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'title',
        'text',
        'type',
        'id_user',
        'id_sender',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'id_sender', 'id_user');
    }
}
