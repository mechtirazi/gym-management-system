<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NutritionMessage extends Model
{
    use HasFactory;

    protected $table = 'nutrition_messages';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'id_sender',
        'id_receiver',
        'text',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'id_sender', 'id_user');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'id_receiver', 'id_user');
    }
}
