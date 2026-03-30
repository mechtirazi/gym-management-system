<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;
    use HasUuids;

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_member',
        'id_gym',
        'enrollment_date',
        'status',
        'type',
    ];

    // Relationships
    public function member()
    {
        return $this->belongsTo(User::class, 'id_member', 'id_user');
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'id_gym', 'id_gym');
    }
}
