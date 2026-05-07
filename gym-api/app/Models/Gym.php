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

    protected $appends = ['members_count', 'active_members_count', 'average_rating'];

    protected $fillable = [
        'name',
        'email',
        'adress',
        'capacity',
        'open_mon_fri',
        'open_sat',
        'open_sun',
        'phone',
        'description',
        'picture',
        'id_owner',
        'status',
        'suspension_reason',
        'plan',
        'platform_subscription_type',
        'platform_subscription_price',
        'subscription_expires_at',
        'last_payment_date',
        'last_receipt_image',
        'is_payment_pending',
    ];

    /**
     * Boot the model to handle automatic subscription expiry calculation
     */
    protected static function booted()
    {
        static::creating(function ($gym) {
            // Set subscription expiration date based on type
            if ($gym->platform_subscription_type) {
                $now = now();
                switch ($gym->platform_subscription_type) {
                    case 'monthly':
                        $gym->subscription_expires_at = $now->addMonth();
                        break;
                    case 'semester':
                        $gym->subscription_expires_at = $now->addMonths(6);
                        break;
                    case 'yearly':
                        $gym->subscription_expires_at = $now->addYear();
                        break;
                    default:
                        $gym->subscription_expires_at = $now->addMonth();
                }
            }
        });
    }

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

    public function getActiveMembersCountAttribute()
    {
        return $this->members()->where('status', 'active')->count();
    }

    public function getAverageRatingAttribute()
    {
        return round($this->reviews()->avg('rating') ?? 0, 1);
    }

    public function getReviewsCountAttribute()
    {
        return $this->reviews()->count();
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'id_gym', 'id_gym');
    }

    public function membershipPlans()
    {
        return $this->hasMany(MembershipPlan::class, 'id_gym', 'id_gym');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'id_gym', 'id_gym');
    }
}
