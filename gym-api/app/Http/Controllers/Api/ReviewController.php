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
}
