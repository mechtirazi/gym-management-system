<?php

namespace App\Traits;

use App\Models\Like;
use App\Models\Comment;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\Auth;

trait HasSocialInteractions
{
    /**
     * Get all of the entity's likes.
     */
    public function likes(): MorphMany
    {
        return $this->morphMany(Like::class, 'likeable');
    }

    /**
     * Get all of the entity's comments.
     */
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    /**
     * Check if the current authenticated user has liked this entity.
     */
    public function getIsLikedAttribute(): bool
    {
        $userId = Auth::id();
        if (!$userId) return false;
        
        return $this->likes()->where('id_user', $userId)->exists();
    }

    /**
     * Get the count of likes.
     */
    public function getLikesCountAttribute(): int
    {
        return $this->likes()->count();
    }

    /**
     * Get the count of comments.
     */
    public function getCommentsCountAttribute(): int
    {
        return $this->comments()->count();
    }
}
