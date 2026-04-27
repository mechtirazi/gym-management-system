<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use App\Models\Wallet;

/**
 * @property int $manual_calories
 * @property int $manual_protein
 * @property int $manual_carbs
 * @property int $manual_fats
 * @property float $manual_water
 * @property float $manual_weight
 * @property float $target_weight
 * @property int $evolution_points
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens; /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory;
    use HasUuids;
    use Notifiable;

    protected $primaryKey = 'id_user';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * Valid roles for users
     */
    public const ROLE_SUPER_ADMIN = 'super_admin';

    public const ROLE_OWNER = 'owner';

    public const ROLE_TRAINER = 'trainer';

    public const ROLE_MEMBER = 'member';

    public const ROLE_NUTRITIONIST = 'nutritionist';

    public const ROLE_RECEPTIONIST = 'receptionist';

    public const VALID_ROLES = [
        self::ROLE_SUPER_ADMIN,
        self::ROLE_OWNER,
        self::ROLE_TRAINER,
        self::ROLE_MEMBER,
        self::ROLE_NUTRITIONIST,
        self::ROLE_RECEPTIONIST,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'last_name',
        'email',
        'email_verified_at',
        'password',
        'status',
        'suspension_reason',
        'role',
        'phone',
        'creation_date',
        'profile_picture',
        'provider',
        'provider_id',
        'manual_calories',
        'manual_protein',
        'manual_carbs',
        'manual_fats',
        'manual_water',
        'manual_weight',
        'target_weight',
        'evolution_points',
        'nutritionist_advisory',
        'notification_email',
        'notification_sms',
        'notification_marketing',
        'notification_app_updates',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Boot the model - add event listeners for validation
     */
    protected static function boot()
    {
        parent::boot();

        // Validate role on create
        static::creating(function ($model) {
            if (!in_array($model->role, self::VALID_ROLES)) {
                throw new \InvalidArgumentException(
                    "Invalid role: {$model->role}. Valid roles are: " . implode(', ', self::VALID_ROLES)
                );
            }
        });

        // Validate role on update
        static::updating(function ($model) {
            if (!in_array($model->role, self::VALID_ROLES)) {
                throw new \InvalidArgumentException(
                    "Invalid role: {$model->role}. Valid roles are: " . implode(', ', self::VALID_ROLES)
                );
            }
        });

        // Create wallet for new members
        static::created(function ($model) {
            if ($model->role === self::ROLE_MEMBER) {
                $model->wallet()->create();
            }
        });

        static::updated(function ($model) {
            if (
                $model->wasChanged('role')
                && $model->role === self::ROLE_MEMBER
                && !$model->wallet
            ) {
                $model->wallet()->create();
            }
        });
    }

    // Relationships
    public function ownedGyms()
    {
        return $this->hasMany(Gym::class, 'id_owner', 'id_user');
    }

    public function trainingSessions()
    {
        return $this->hasMany(Session::class, 'id_trainer', 'id_user');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'id_member', 'id_user');
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscribe::class, 'id_user', 'id_user');
    }

    public function nutritionPlansAsNutritionist()
    {
        return $this->hasMany(NutritionPlan::class, 'id_nutritionist', 'id_user');
    }

    public function nutritionPlansAsMember()
    {
        return $this->hasMany(NutritionPlan::class, 'id_member', 'id_user');
    }

    public function nutritionPlans()
    {
        return $this->belongsToMany(NutritionPlan::class, 'nutrition_plan_member', 'id_user', 'id_plan');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'id_user', 'id_user');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'id_member', 'id_user');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'id_user', 'id_user');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'id_user', 'id_user');
    }

    public function eventAttendances()
    {
        return $this->hasMany(AttendanceEvent::class, 'id_member', 'id_user');
    }

    public function gymStaff()
    {
        return $this->hasMany(GymStaff::class, 'id_user', 'id_user');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'id_member', 'id_user');
    }

    public function enrolledCourses()
    {
        return $this->belongsToMany(Course::class, 'enrollments', 'id_member', 'id_course')
            ->withPivot('status')
            ->withTimestamps();
    }

    public function biometricLogs()
    {
        return $this->hasMany(BiometricLog::class, 'id_member', 'id_user');
    }

    /**
     * Member wallet (only for users with role = member)
     */
    public function wallet()
    {
        return $this->hasOne(Wallet::class, 'user_id', 'id_user');
    }

    public function assignedGyms()
    {
        return $this->hasManyThrough(
            Gym::class,
            GymStaff::class,
            'id_user',
            'id_gym',
            'id_user',
            'id_gym'
        );
    }

    public function associatedGymIds()
    {
        return $this->allowedGymIds();
    }

    /**
     * Return a Collection of gym ids the user is associated with.
     *
     * A user may have access to a gym in three different ways:
     *   1. they own the gym,
     *   2. they are assigned as staff to the gym, or
     *   3. they have an active enrollment in the gym.
     *
     * Subscriptions are intentionally excluded from this scope; the
     * caller should make that decision separately if required.
     *
     * If the user has global access (super_admin role) then `null`
     * is returned to signal unrestricted gym visibility.
     *
     * @return \Illuminate\Support\Collection|null
     */
    public function allowedGymIds()
    {
        $owned = $this->ownedGyms()->pluck('id_gym');
        $assigned = $this->assignedGyms()->pluck('gyms.id_gym');
        $enrolled = $this->enrollments()->pluck('id_gym');

        $ids = $owned->merge($assigned)->merge($enrolled);

        return $ids->unique()->values();
    }
}
