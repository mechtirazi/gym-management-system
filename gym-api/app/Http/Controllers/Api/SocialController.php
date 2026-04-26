<?php

namespace App\Http\Controllers\Api;

use App\Models\Like;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Relations\Relation;

class SocialController extends BaseApiController
{
    /**
     * Map type strings to model classes.
     */
    protected $typeMap = [
        'EVENT' => \App\Models\Event::class,
        'COURSE' => \App\Models\Course::class,
        'PRODUCT' => \App\Models\Product::class,
        'NUTRITION_PLAN' => \App\Models\NutritionPlan::class,
        'MEMBERSHIP' => \App\Models\Subscribe::class,
    ];

    public function toggleLike(Request $request)
    {
        $request->validate([
            'id' => 'required',
            'type' => 'required|in:EVENT,COURSE,PRODUCT,NUTRITION_PLAN,MEMBERSHIP',
        ]);

        $userId = Auth::id();
        $modelClass = $this->typeMap[$request->type];
        
        // Find the entity
        $entity = $modelClass::findOrFail($request->id);

        $like = Like::where([
            'id_user' => $userId,
            'likeable_id' => $request->id,
            'likeable_type' => $modelClass,
        ])->first();

        if ($like) {
            $like->delete();
            return response()->json(['message' => 'Unliked', 'liked' => false]);
        } else {
            Like::create([
                'id_user' => $userId,
                'likeable_id' => $request->id,
                'likeable_type' => $modelClass,
            ]);
            return response()->json(['message' => 'Liked', 'liked' => true]);
        }
    }

    public function addComment(Request $request)
    {
        $request->validate([
            'id' => 'required',
            'type' => 'required|in:EVENT,COURSE,PRODUCT,NUTRITION_PLAN,MEMBERSHIP',
            'content' => 'required|string|max:1000',
        ]);

        $userId = Auth::id();
        $modelClass = $this->typeMap[$request->type];

        // Ensure entity exists
        $entity = $modelClass::findOrFail($request->id);

        $comment = Comment::create([
            'id_user' => $userId,
            'commentable_id' => $request->id,
            'commentable_type' => $modelClass,
            'content' => $request->content,
        ]);

        return response()->json([
            'message' => 'Comment added',
            'comment' => $comment->load('user'),
        ]);
    }

    public function getComments(Request $request)
    {
        $request->validate([
            'id' => 'required',
            'type' => 'required|in:EVENT,COURSE,PRODUCT,NUTRITION_PLAN,MEMBERSHIP',
        ]);

        $modelClass = $this->typeMap[$request->type];
        $comments = Comment::where('commentable_id', $request->id)
            ->where('commentable_type', $modelClass)
            ->with('user')
            ->latest()
            ->get();

        return response()->json(['data' => $comments]);
    }
}
