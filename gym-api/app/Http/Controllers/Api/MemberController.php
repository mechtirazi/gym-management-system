<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OwnerDashboardService;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\WalletTransaction;
use App\Models\Gym;
use App\Models\Subscribe;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class MemberController extends Controller
{
    protected $dashboardService;

    public function __construct(OwnerDashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function getDashboardStats(Request $request)
    {
        $stats = $this->dashboardService->getMemberStats($request->user());
        return response()->json($stats);
    }

    /**
     * Enroll a member in a course. Supports Zen Credits (Points) or Credit Card.
     */
    public function enrollCourse(Request $request, Course $course)
    {
        $user = $request->user();
        $wallet = $user->wallet;
        $method = $request->input('payment_method', 'zen_wallet');

        // 1. Check if already enrolled in this SPECIFIC gym (Business Rule: 1 active enrollment per node)
        $exists = Enrollment::where('id_member', $user->id_user)
            ->where('id_gym', $course->id_gym)
            ->where('status', 'active')
            ->exists();
        
        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Your biometric signature is already synced with a training node in this facility.'], 400);
        }

        // 2. Logic based on payment method
        if ($method === 'zen_wallet') {
            if (!$wallet || $wallet->balance < $course->price) {
                return response()->json([
                    'success' => false, 
                    'message' => 'Insufficient Zen Credits (Points). Current balance: ' . ($wallet ? $wallet->balance : '0') . ' pts',
                    'required' => $course->price
                ], 400);
            }
        }

        return DB::transaction(function () use ($user, $course, $wallet, $method) {
            $transactionId = 'ZEN-' . strtoupper(Str::random(12));

            if ($method === 'zen_wallet') {
                // Deduct Points
                $wallet->decrement('balance', $course->price);

                WalletTransaction::create([
                    'wallet_id' => $wallet->id,
                    'amount' => $course->price,
                    'type' => 'debit',
                    'description' => "Training Program Sync via Points: {$course->name}",
                    'reference_type' => Course::class,
                    'reference_id' => $course->id_course
                ]);
            } else {
                // Mocking Credit Card Success
                $transactionId = 'PROG-' . strtoupper(Str::random(12));
            }

            // 5. Create Payment Record (Revenue Insight)
            Payment::create([
                'id_user' => $user->id_user,
                'id_gym' => $course->id_gym,
                'id_course' => $course->id_course,
                'amount' => $course->price,
                'method' => $method,
                'type' => 'course',
                'id_transaction' => $transactionId
            ]);

            // 6. Create Enrollment Record
            $enrollment = Enrollment::create([
                'id_member' => $user->id_user,
                'id_gym' => $course->id_gym,
                'enrollment_date' => now(),
                'status' => 'active',
                'type' => 'premium'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Program Synchronization Complete! Program: ' . $course->name,
                'data' => [
                    'enrollment' => $enrollment,
                    'payment_method' => $method,
                    'new_balance' => $wallet ? $wallet->fresh()->balance : 0
                ]
            ]);
        });
    }

    /**
     * Buy a membership for a gym. Supports Zen Credits (Points) or Credit Card.
     */
    public function purchaseMembership(Request $request, Gym $gym)
    {
        $user = $request->user();
        $wallet = $user->wallet;
        $method = $request->input('payment_method', 'zen_wallet');
        $price = 49.99; // Standard membership price

        // 1. Double-check for existing active subscription
        $exists = Subscribe::where('id_user', $user->id_user)
            ->where('id_gym', $gym->id_gym)
            ->where('status', Subscribe::STATUS_ACTIVE)
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Active synchronization node already exists for this facility.'], 400);
        }

        // 2. Logic based on payment method
        if ($method === 'zen_wallet') {
            if (!$wallet || $wallet->balance < $price) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient Zen Credits (Points). Current balance: ' . ($wallet ? $wallet->balance : '0') . ' pts',
                    'required' => $price
                ], 400);
            }
        }

        return DB::transaction(function () use ($user, $gym, $wallet, $price, $method) {
            $transactionId = 'TXN-' . strtoupper(Str::random(12));

            if ($method === 'zen_wallet') {
                // Deduct Points
                $wallet->decrement('balance', $price);

                WalletTransaction::create([
                    'wallet_id' => $wallet->id,
                    'amount' => $price,
                    'type' => 'debit',
                    'description' => "Membership Activation via Points: {$gym->name}",
                    'reference_type' => Gym::class,
                    'reference_id' => $gym->id_gym
                ]);
                $transactionId = 'ZEN-SUB-' . strtoupper(Str::random(12));
            } else {
                // Mocking Credit Card Success
                $transactionId = 'STRIPE-' . strtoupper(Str::random(12));
            }

            // 5. Create Unified Payment Record
            Payment::create([
                'id_user' => $user->id_user,
                'id_gym' => $gym->id_gym,
                'amount' => $price,
                'method' => $method, // 'zen_wallet' or 'credit_card'
                'type' => 'membership',
                'id_transaction' => $transactionId
            ]);

            // 6. Create Subscribe Record
            $subscription = Subscribe::create([
                'id_user' => $user->id_user,
                'id_gym' => $gym->id_gym,
                'status' => Subscribe::STATUS_ACTIVE,
                'subscribe_date' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => $method === 'zen_wallet' 
                    ? "Access protocol initiated via Zen Points! Welcome to {$gym->name}."
                    : "Payment processed successfully via {$method}. Your access to {$gym->name} is now live.",
                'data' => [
                    'subscription' => $subscription,
                    'payment_method' => $method,
                    'new_balance' => $wallet ? $wallet->fresh()->balance : 0
                ]
            ]);
        });
    }

    /**
     * Member Check-in to the facility.
     */
    public function checkIn(Request $request)
    {
        $user = $request->user();
        
        $activeSub = Subscribe::where('id_user', $user->id_user)
            ->where('status', Subscribe::STATUS_ACTIVE)
            ->first();
            
        if (!$activeSub) {
            return response()->json([
                'success' => false,
                'message' => 'No active membership node found. Please activate a subscription to check-in.'
            ], 403);
        }

        $attendance = Attendance::create([
            'id_member' => $user->id_user,
            'id_session' => null, 
            'status' => 'present'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Node Synchronization Successful! Welcome to the facility.',
            'data' => $attendance
        ]);
    }

    /**
     * Update manual biometric stats (Full Node Sync).
     */
    public function updateBiometrics(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'calories' => 'integer|min:0',
            'protein' => 'integer|min:0',
            'carbs' => 'integer|min:0',
            'fats' => 'integer|min:0',
            'water' => 'numeric|min:0',
            'weight' => 'numeric|min:0',
        ]);

        // Detect if this is the first sync of the day for rewarding points
        $lastUpdate = $user->updated_at;
        $isNewDay = !$lastUpdate || !Carbon::parse($lastUpdate)->isToday();

        // Update values
        if ($request->has('calories')) $user->manual_calories = $request->calories;
        if ($request->has('protein')) $user->manual_protein = $request->protein;
        if ($request->has('carbs')) $user->manual_carbs = $request->carbs;
        if ($request->has('fats')) $user->manual_fats = $request->fats;
        if ($request->has('water')) $user->manual_water = $request->water;
        if ($request->has('weight')) $user->manual_weight = $request->weight;

        // Reward points ONLY once per day for biometric synchronization to prevent farming
        if ($isNewDay) {
            $user->evolution_points += 25; // Bonus for daily consistency
        }

        $user->save();

        $stats = $this->dashboardService->getMemberStats($user);

        return response()->json([
            'success' => true,
            'message' => 'Bio-Pulse Synchronized Successfully!',
            'stats' => $stats
        ]);
    }

    /**
     * Store a complete workout log session.
     */
    public function storeWorkoutLog(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'nullable|string',
            'exercises' => 'required|array',
            'exercises.*.exercise_name' => 'required|string',
            'exercises.*.sets' => 'required|array',
            'exercises.*.sets.*.weight' => 'numeric|min:0',
            'exercises.*.sets.*.reps' => 'integer|min:0',
        ]);

        return DB::transaction(function () use ($request, $user) {
            $workoutLog = \App\Models\WorkoutLog::create([
                'id_member' => $user->id_user,
                'name' => $request->input('name', 'Metropolitan Quick Session'),
                'workout_date' => now(),
            ]);

            foreach ($request->input('exercises') as $index => $exData) {
                $exercise = $workoutLog->exercises()->create([
                    'exercise_name' => $exData['exercise_name'],
                    'order' => $index,
                ]);

                foreach ($exData['sets'] as $setIndex => $setData) {
                    $exercise->sets()->create([
                        'set_number' => $setIndex + 1,
                        'weight' => $setData['weight'],
                        'reps' => $setData['reps'],
                    ]);
                }
            }

            // Reward for high-fidelity synchronization
            $user->evolution_points += 50;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Workout Pulse Synchronized with Core Database!',
                'data' => $workoutLog->load('exercises.sets')
            ]);
        });
    }

    /**
     * Get member's workout history.
     */
    public function getWorkoutHistory(Request $request)
    {
        $history = \App\Models\WorkoutLog::where('id_member', $request->user()->id_user)
            ->with(['exercises.sets'])
            ->orderBy('workout_date', 'desc')
            ->paginate(10);

        return response()->json($history);
    }
}
