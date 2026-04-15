<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreReviewRequest;
use App\Http\Requests\UpdateReviewRequest;
use App\Models\Review;
use App\Services\ReviewService;

class ReviewController extends BaseApiController
{
    public function __construct(ReviewService $reviewService)
    {
        $this->configureBase(
            $reviewService,
            'review',
            StoreReviewRequest::class,
            UpdateReviewRequest::class
        );
    }

    public function indexForGym(\App\Models\Gym $gym)
    {
        $reviews = $gym->reviews()->with('user')->orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $reviews,
            'message' => 'Gym reviews retrieved successfully'
        ]);
    }

    public function storeForGym(\App\Models\Gym $gym, storeReviewRequest $request)
    {
        $validatedData = $request->validated();
        
        // Auto-fill metadata for high-fidelity synchronization
        $validatedData['id_gym'] = $gym->id_gym;
        $validatedData['id_user'] = auth()->id();
        $validatedData['review_date'] = now();

        $review = $this->service->create($validatedData);

        return response()->json([
            'success' => true,
            'data' => $review,
            'message' => 'Review Protocol Synchronized Successfully!'
        ], 201);
    }
}
