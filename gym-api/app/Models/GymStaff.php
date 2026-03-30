<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class GymStaff extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'gym_staff';

    protected $primaryKey = 'id_gym_staff';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_gym',
        'id_user',
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
