<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Gym extends Model
{
    /** @use HasFactory<\Database\Factories\GymFactory> */
    use HasFactory;
    use HasUuids;

    protected $primaryKey = 'id_gym';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $appends = ['members_count'];

    protected $fillable = [
        'name',
        'adress',
        'capacity',
        'open_hour',
        'phone',
        'description',
        'id_owner',
        'status',
        'suspension_reason',
        'plan',
        'subscription_expires_at',
        'last_payment_date',
        'last_receipt_image',
        'is_payment_pending',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subscription_expires_at' => 'datetime',
            'last_payment_date' => 'datetime',
            'is_payment_pending' => 'boolean',
        ];
    }

    // Relationships
    public function owner()
    {
        return $this->belongsTo(User::class, 'id_owner', 'id_user');
    }

    public function courses()
    {
        return $this->hasMany(Course::class, 'id_gym', 'id_gym');
    }

    public function events()
    {
        return $this->hasMany(Event::class, 'id_gym', 'id_gym');
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscribe::class, 'id_gym', 'id_gym');
    }

    public function staff()
    {
        return $this->hasMany(GymStaff::class, 'id_gym', 'id_gym');
    }

    public function staffMembers()
    {
        return $this->hasManyThrough(
            User::class,
            GymStaff::class,
            'id_gym',
            'id_user',
            'id_gym',
            'id_user'
        );
    }

    /**
     * Gym members are represented by rows in the `enrollments` table.
     */
    public function members()
    {
        return $this->hasMany(Enrollment::class, 'id_gym', 'id_gym');
    }

    public function getMembersCountAttribute()
    {
        return $this->members()->count();
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'id_gym', 'id_gym');
    }
}
