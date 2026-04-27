<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreAttendanceEventRequest;
use App\Http\Requests\UpdateAttendanceEventRequest;
use App\Models\AttendanceEvent;
use App\Services\AttendanceEventService;
use Illuminate\Http\Request;
use Illuminate\Auth\Access\AuthorizationException;

class AttendanceEventController extends BaseApiController
{
    public function __construct(AttendanceEventService $attendanceEventService)
    {
        $this->configureBase(
            $attendanceEventService,
            'attendanceEvent',
            StoreAttendanceEventRequest::class,
            UpdateAttendanceEventRequest::class
        );
    }

    protected function getModelClass()
    {
        return AttendanceEvent::class;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $eventId = $request->query('id_event');
        
        try {
            if ($eventId) {
                // For a specific event, we can bypass the full scope if the user owns the gym
                // but for simplicity we'll just use the service method and then filter or scope
                $data = $this->service->getAttendanceEventsByEventId($eventId);
                return response()->json([
                    'success' => true,
                    'data' => $data,
                    'message' => 'Attendances for event retrieved successfully',
                ], 200);
            }

            return parent::index($request);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $this->authorize('create', AttendanceEvent::class);

            $validatedData = $this->storeRequest
                ? app($this->storeRequest)->validated()
                : $request->all();

            // Members can only create their own attendance
            if (auth()->user()->role === \App\Models\User::ROLE_MEMBER) {
                if (empty($validatedData['id_member']) || $validatedData['id_member'] !== auth()->user()->id_user) {
                    throw new AuthorizationException('Members may only create their own attendance');
                }
            }

            $data = $this->service->create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' created successfully'
            ], 201);
        } catch (AuthorizationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: ' . $e->getMessage()
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $model = $this->findModel($id) ?? $this->service->getById($id);

            $this->authorize('view', $model);

            return response()->json([
                'success' => true,
                'data' => $model,
                'message' => ucfirst($this->modelName) . ' retrieved successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            $model = $this->findModel($id) ?? $this->service->getById($id);

            $this->authorize('update', $model);

            $validatedData = $this->updateRequest
                ? app($this->updateRequest)->validated()
                : $request->all();

            // Members can only update their own attendance
            if (auth()->user()->role === \App\Models\User::ROLE_MEMBER) {
                if ($model->id_member !== auth()->user()->id_user) {
                    throw new AuthorizationException('Members may only update their own attendance');
                }
                if (isset($validatedData['id_member']) && $validatedData['id_member'] !== auth()->user()->id_user) {
                    throw new AuthorizationException('Members may not reassign attendance');
                }
            }

            $data = $this->service->update($model, $validatedData);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => ucfirst($this->modelName) . ' updated successfully'
            ], 200);
        } catch (AuthorizationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: ' . $e->getMessage()
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $model = $this->findModel($id) ?? $this->service->getById($id);

            $this->authorize('delete', $model);

            $this->service->delete($model);

            return response()->json([
                'success' => true,
                'message' => ucfirst($this->modelName) . ' deleted successfully'
            ], 204);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting ' . $this->modelName . ': ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Mark an attendance record as the reward winner and award points.
     */
    public function rewardWinner(Request $request, $id)
    {
        try {
            $attendance = AttendanceEvent::with('event')->findOrFail($id);
            $event = $attendance->event;

            // 1. Authorize - only gym owner/staff should do this
            // We can simplify and use the same logic as update
            $this->authorize('update', $attendance);

            // 2. Validate event status and rewardability
            if (!$event->is_rewarded) {
                return response()->json(['success' => false, 'message' => 'This event is not configured for rewards.'], 400);
            }

            // 3. Ensure event is completed (or at least ongoing)
            // For now, let's just check if it's rewarded.

            // 4. Ensure winners limit is not reached
            $winnersCount = AttendanceEvent::where('id_event', $event->id_event)
                ->where('is_winner', true)
                ->count();

            $maxWinners = $event->max_winners ?: 1;

            if ($winnersCount >= $maxWinners) {
                return response()->json([
                    'success' => false, 
                    'message' => "The synchronization limit for this event node has been reached ({$maxWinners} winner(s) max)."
                ], 400);
            }

            return \Illuminate\Support\Facades\DB::transaction(function () use ($attendance, $event) {
                // 5. Mark as winner
                $attendance->is_winner = true;
                $attendance->save();

                // 6. Award points to the member
                $member = $attendance->member;
                if ($member) {
                    $amount = $event->reward_amount ?: 50;
                    
                    // Award gamification points
                    $member->evolution_points += $amount;
                    $member->save();

                    // Award spendable ZEN credits (Wallet)
                    $wallet = $member->wallet;
                    if (!$wallet) {
                        $wallet = \App\Models\Wallet::create(['user_id' => $member->id_user, 'balance' => 0]);
                    }
                    
                    $wallet->increment('balance', $amount);

                    // Create transparency for the transaction
                    \App\Models\WalletTransaction::create([
                        'wallet_id' => $wallet->id,
                        'amount' => $amount,
                        'type' => 'credit',
                        'description' => "Event Victory Reward: {$event->title}",
                        'reference_type' => \App\Models\Event::class,
                        'reference_id' => $event->id_event
                    ]);

                    // 7. Create a notification for the member
                    \App\Models\Notification::create([
                        'id_user' => $member->id_user,
                        'title' => 'Zen Points Rewarded!',
                        'text' => "Congratulations! You've been selected as the gainer for '{$event->title}'. {$amount} Zen Points have been added to your balance.",
                        'type' => 'success'
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Reward synchronization successful. Points added to ' . ($member ? "{$member->name}'s wallet" : 'member'),
                    'data' => $attendance
                ]);
            });

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Reward Error: ' . $e->getMessage()
            ], 500);
        }
    }
}
