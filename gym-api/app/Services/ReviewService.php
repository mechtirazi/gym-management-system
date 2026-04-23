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
            return $query->whereIn('id_gym', function ($q) use ($user) {
                $q->select('id_gym')->from('gyms')->where('id_owner', $user->id_user);
            })->orWhereHas('event.gym', function ($q) use ($user) {
                $q->where('id_owner', $user->id_user);
            })->get();
        }

        // Staff (Receptionist, Trainer, Nutritionist) see reviews for their assigned gyms
        if (in_array($user->role, [User::ROLE_RECEPTIONIST, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])) {
            
            // Apply active gym scope if header is present
            $this->applyActiveGymScope($query, $user, 'id_gym');

            // If the user is a trainer, respect the active gym context
            if ($user->role === User::ROLE_TRAINER) {
                // If id_gym was NOT applied by applyActiveGymScope (no header), 
                // then fallback to all allowed gyms but still include trainer's own reviews
                if (!$this->getActiveGymId()) {
                    $gymIds = $user->allowedGymIds();
                    $query->where(function ($q) use ($gymIds, $user) {
                        $q->whereIn('id_gym', $gymIds)
                          ->orWhereHas('event', fn($sq) => $sq->whereIn('id_gym', $gymIds))
                          ->orWhereHas('course', fn($sq) => $sq->whereIn('id_gym', $gymIds))
                          ->orWhere('id_trainer', $user->id_user);
                    });
                }
                return $perPage ? $query->paginate($perPage) : $query->get();
            }

            // For other staff (Receptionist, Nutritionist), keep the event scoping if that's what's designed.
            $this->applyActiveGymScope($query, $user, 'id_gym', function ($q, $gymId) {
                $q->whereHas('event', function ($sq) use ($gymId) {
                    $sq->where('id_gym', $gymId);
                });
            });

            return $query->whereHas('event.gym', function ($q) use ($user) {
                $q->whereIn('gyms.id_gym', $user->allowedGymIds());
            })->get();
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
            $data['ai_sentiment_score'] = $analysis['score'];
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
