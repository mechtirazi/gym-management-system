<?php

namespace App\Services;

use App\Models\Review;
use App\Models\User;
use App\Models\GymStaff;

class ReviewService extends BaseService
{
    protected $aiService;
    protected $notificationService;

    public function __construct(AIService $aiService, NotificationService $notificationService)
    {
        $this->setModel(new Review());
        $this->setRelations(['user', 'event.gym', 'trainer.gymStaff', 'course.gym', 'session.course.gym']);
        $this->aiService = $aiService;
        $this->notificationService = $notificationService;
    }

    /**
     * Get all reviews filtered by user access
     */
    public function getAllScoped($user, ?int $perPage = null)
    {
        $query = $this->query();

        // Owners only see reviews for their gyms
        if ($user->role === User::ROLE_OWNER) {
            $this->applyActiveGymScope($query, $user, 'id_gym');
            
            $query->where(function($q) use ($user) {
                $q->whereIn('id_gym', function ($sq) use ($user) {
                    $sq->select('id_gym')->from('gyms')->where('id_owner', $user->id_user);
                })->orWhereHas('event.gym', function ($sq) use ($user) {
                    $sq->where('id_owner', $user->id_user);
                });
            });

            return $query->get();
        }

        // Staff (Receptionist, Trainer, Nutritionist) see reviews for their assigned gyms
        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            
            // 1. First apply gym scoping based on the active gym header if present
            $this->applyActiveGymScope($query, $user, 'id_gym', function ($q, $gymId) {
                $q->where(function ($sub) use ($gymId) {
                    $sub->where('id_gym', $gymId)
                        ->orWhereHas('event', fn($sq) => $sq->where('id_gym', $gymId))
                        ->orWhereHas('course', fn($sq) => $sq->where('id_gym', $gymId))
                        ->orWhereHas('session.course', fn($sq) => $sq->where('id_gym', $gymId));
                });
            });

            // 2. If no header is present, fallback to all allowed gyms
            if (!$this->getActiveGymId()) {
                $gymIds = $user->allowedGymIds();
                $query->where(function ($q) use ($gymIds, $user) {
                    $q->whereIn('id_gym', $gymIds)
                      ->orWhereHas('event', fn($sq) => $sq->whereIn('id_gym', $gymIds))
                      ->orWhereHas('course', fn($sq) => $sq->whereIn('id_gym', $gymIds))
                      ->orWhereHas('session.course', fn($sq) => $sq->whereIn('id_gym', $gymIds));
                    
                    // Specific to trainers: always show their own reviews regardless of gym
                    if ($user->role === User::ROLE_TRAINER) {
                        $q->orWhere('id_trainer', $user->id_user);
                    }
                });
            }

            return $perPage ? $query->paginate($perPage) : $query->get();
        }
        // Members see their own reviews
        elseif ($user->role === User::ROLE_MEMBER) {
            $query->where('id_user', $user->id_user);
        }

        // Return paginated or full collection
        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    /**
     * Get reviews by event ID
     */
    public function getReviewsByEventId(string $eventId)
    {
        return $this->getBy('id_event', $eventId);
    }

    /**
     * Get reviews by user ID
     */
    public function getReviewsByUserId(string $userId)
    {
        return $this->getBy('id_user', $userId);
    }

    /**
     * Create a review with AI sentiment analysis
     */
    public function create(array $data): \Illuminate\Database\Eloquent\Model
    {
        // 1. Analyze the review content with AI
        if (isset($data['comment']) && !empty($data['comment'])) {
            $analysis = $this->aiService->analyzeReview($data['comment']);
            $aiScore = $analysis['score'];
            
            // 2. Blend AI score with manual rating for higher fidelity
            // If the user gave 4 or 5 stars, the sentiment shouldn't be "Negative" unless the text is truly bad.
            // We use a weighted average: 60% Rating, 40% AI analysis
            if (isset($data['rating'])) {
                $ratingWeight = $data['rating'] / 5;
                $data['ai_sentiment_score'] = ($ratingWeight * 0.6) + ($aiScore * 0.4);
            } else {
                $data['ai_sentiment_score'] = $aiScore;
            }
            
            $data['ai_category'] = $analysis['category'];
        }

        // 2. Save the review
        $review = parent::create($data);

        // 3. If review is very negative, notify the gym owner and staff
        if (isset($data['ai_sentiment_score']) && $data['ai_sentiment_score'] < 0.3) {
            $this->notifyGymStaff($review);
        }

        return $review;
    }

    /**
     * Notify gym owner and staff about a negative review
     */
    protected function notifyGymStaff(Review $review)
    {
        // Refresh to get relations if not loaded
        $review->load(['event.gym', 'gym', 'user']);
        $gym = $review->gym ?: ($review->event ? $review->event->gym : null);
        if (!$gym) return;

        $message = "Alert: A very negative review was posted for '{$gym->name}' by {$review->user->name}. Sentiment Score: {$review->ai_sentiment_score}. Category: {$review->ai_category}.";

        // Notify Owner
        $this->notificationService->create([
            'id_user' => $gym->id_owner,
            'text' => $message
        ]);

        // Notify Receptionists linked to this gym
        $staffIds = \App\Models\GymStaff::where('id_gym', $gym->id_gym)->pluck('id_user');
        foreach ($staffIds as $userId) {
            $this->notificationService->create([
                'id_user' => $userId,
                'text' => $message
            ]);
        }
    }

    /**
     * Get reviews by rating
     */
    public function getReviewsByRating(int $rating)
    {
        return $this->getBy('rating', $rating);
    }
}
