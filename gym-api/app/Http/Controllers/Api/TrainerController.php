<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Session;
use App\Models\User;
use App\Models\Attendance;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;
use App\Services\SessionService;

class TrainerController extends Controller
{
    protected $sessionService;

    public function __construct(SessionService $sessionService)
    {
        $this->sessionService = $sessionService;
    }

    /**
     * Helper to validate that the trainer is actually assigned to the requested gym.
     */
    protected function validateGymAccess(User $user, $gymId)
    {
        if (!$gymId) return true;
        
        return $user->assignedGyms()->where('gyms.id_gym', $gymId)->exists();
    }

    public function getDashboardStats(Request $request)
    {
        $user = $request->user();
        $gymId = $request->header('X-Gym-Id');

        if ($gymId && !$this->validateGymAccess($user, $gymId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this gym context.'
            ], 403);
        }
        
        $activeClientsCount = DB::table('attendance')
            ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->distinct('attendance.id_member')
            ->count('attendance.id_member');

        // Calculate Active Clients Trend (Current 7 Days vs Previous 7 Days)
        $currentPeriodClients = DB::table('attendance')
            ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function ($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->whereBetween('sessions.date_session', [now()->subDays(7)->toDateString(), now()->toDateString()])
            ->distinct('attendance.id_member')
            ->count('attendance.id_member');

        $previousPeriodClients = DB::table('attendance')
            ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function ($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->whereBetween('sessions.date_session', [now()->subDays(14)->toDateString(), now()->subDays(8)->toDateString()])
            ->distinct('attendance.id_member')
            ->count('attendance.id_member');

        $clientsTrendValue = $currentPeriodClients - $previousPeriodClients;
        $activeClientsTrend = ($clientsTrendValue >= 0 ? '+' : '') . $clientsTrendValue;

        $sessionsTodayCount = Session::join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->whereDate('sessions.date_session', now()->toDateString())
            ->count();

        $completedSessionsCount = Session::join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->where('sessions.status', Session::STATUS_COMPLETED)
            ->whereDate('sessions.date_session', now()->toDateString())
            ->count();

        $rating = DB::table('reviews')
            ->where('id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('reviews.id_gym', $gymId);
            })
            ->avg('rating') ?: 0;

        // Calculate rating trend (comparing this month to previous month)
        $thisMonthAvg = DB::table('reviews')
            ->where('id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('reviews.id_gym', $gymId);
            })
            ->whereMonth('created_at', now()->month)
            ->avg('rating') ?: 0;

        $lastMonthAvg = DB::table('reviews')
            ->where('id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('reviews.id_gym', $gymId);
            })
            ->whereMonth('created_at', now()->subMonth()->month)
            ->avg('rating') ?: 0;

        $trend = 0;
        if ($lastMonthAvg > 0) {
            $trend = (($thisMonthAvg - $lastMonthAvg) / $lastMonthAvg) * 100;
        } elseif ($thisMonthAvg > 0) {
            $trend = 100;
        }

        $ratingTrend = ($trend >= 0 ? '+' : '') . number_format($trend / 100, 1);

        return response()->json([
            'success' => true,
            'data' => [
                'activeClients' => $activeClientsCount,
                'activeClientsTrend' => $activeClientsTrend,
                'sessionsToday' => $sessionsTodayCount,
                'completedToday' => $completedSessionsCount,
                'rating' => round($rating, 1),
                'ratingTrend' => $ratingTrend
            ]
        ]);
    }

    public function getUpcomingSessions(Request $request)
    {
        $user = $request->user();
        $gymId = $request->header('X-Gym-Id');

        if ($gymId && !$this->validateGymAccess($user, $gymId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this gym context.'
            ], 403);
        }

        $this->sessionService->syncSessionStatuses();
        
        $sessions = Session::with(['course.gym'])
            ->withCount('attendances')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->where('sessions.date_session', '>=', now()->toDateString())
            ->where('sessions.status', '!=', Session::STATUS_CANCELLED)
            ->select('sessions.*')
            ->orderBy('sessions.date_session', 'asc')
            ->orderBy('sessions.start_time', 'asc')
            ->take(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $sessions
        ]);
    }

    public function getSessions(Request $request)
    {
        $user = $request->user();
        $start = $request->query('start');
        $end = $request->query('end');

        // Note: For the Calendar view, we provide a unified view across all gyms
        // regardless of the current X-Gym-Id header setting.
        $query = Session::with(['course.gym'])
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->select('sessions.*');

        if ($start) {
            $query->where('sessions.date_session', '>=', $start);
        }
        if ($end) {
            $query->where('sessions.date_session', '<=', $end);
        }

        $sessions = $query->orderBy('sessions.date_session', 'asc')
            ->orderBy('sessions.start_time', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $sessions
        ]);
    }

    public function broadcast(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'message' => 'required|string',
            'type' => 'required|in:info,warning,promo',
            'id_course' => 'nullable|string|exists:courses,id_course',
            'id_session' => 'nullable|string|exists:sessions,id_session'
        ]);

        $user = $request->user();
        $gymId = $request->header('X-Gym-Id');
        
        $memberIds = collect();

        if (isset($validated['id_course'])) {
            // Target all members enrolled in the course
            $memberIds = DB::table('enrollments')
                ->where('id_course', $validated['id_course'])
                ->where('status', 'active')
                ->pluck('id_member');
        } elseif (isset($validated['id_session'])) {
            // Target members who attended or are scheduled for this session
            $memberIds = DB::table('attendance')
                ->where('id_session', $validated['id_session'])
                ->pluck('id_member');
            
            // If no attendance yet, fallback to all course members for that session's course
            if ($memberIds->isEmpty()) {
                $session = Session::find($validated['id_session']);
                if ($session) {
                    $memberIds = DB::table('enrollments')
                        ->where('id_course', $session->id_course)
                        ->where('status', 'active')
                        ->pluck('id_member');
                }
            }
        } else {
            // General broadcast to all members of the trainer across all their courses in this gym
            $memberIds = DB::table('enrollments')
                ->join('courses', 'enrollments.id_course', '=', 'courses.id_course')
                ->where('courses.id_trainer', $user->id_user)
                ->when($gymId, function($q) use ($gymId) {
                    return $q->where('courses.id_gym', $gymId);
                })
                ->where('enrollments.status', 'active')
                ->distinct()
                ->pluck('enrollments.id_member');
        }

        if ($memberIds->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No active members found to receive this broadcast.'
            ], 404);
        }

        // Send notifications
        $notifications = [];
        $now = now();
        foreach ($memberIds as $memberId) {
            $notifications[] = [
                'id_notification' => \Illuminate\Support\Str::uuid(),
                'id_user' => $memberId,
                'title' => $validated['title'],
                'text' => $validated['message'],
                'type' => $validated['type'],
                'is_read' => false,
                'created_at' => $now,
                'updated_at' => $now
            ];
        }

        // Bulk insert for performance
        DB::table('notifications')->insert($notifications);

        return response()->json([
            'success' => true,
            'message' => 'Broadcast sent successfully to ' . $memberIds->count() . ' members.'
        ]);
    }

    public function saveSessionNotes(Request $request, Session $session)
    {
        $this->authorize('update', $session);

        $validated = $request->validate([
            'coaching_notes' => 'nullable|string'
        ]);

        $session->update([
            'coaching_notes' => $validated['coaching_notes']
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Session notes saved successfully.',
            'data' => $session
        ]);
    }

    public function getAnalytics(Request $request)
    {
        $user = $request->user();
        $gymId = $request->header('X-Gym-Id');

        if ($gymId && !$this->validateGymAccess($user, $gymId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this gym context.'
            ], 403);
        }

        // 1. Session Popularity (Top 5 courses by attendance)
        $sessionPopularity = DB::table('attendance')
            ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->select('courses.name', DB::raw('count(attendance.id_attendance) as total_attendance'))
            ->groupBy('courses.id_course', 'courses.name')
            ->orderBy('total_attendance', 'desc')
            ->take(5)
            ->get();

        // 2. Attendance Trend (Last 7 days)
        $attendanceTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $count = DB::table('attendance')
                ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
                ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
                ->where('sessions.id_trainer', $user->id_user)
                ->when($gymId, function($q) use ($gymId) {
                    return $q->where('courses.id_gym', $gymId);
                })
                ->whereDate('sessions.date_session', $date)
                ->count();
            
            $attendanceTrend[] = [
                'date' => now()->subDays($i)->format('D'),
                'count' => $count
            ];
        }

        // 3. Member Engagement (Top 5 members by attendance)
        $memberEngagement = DB::table('attendance')
            ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->join('users', 'attendance.id_member', '=', 'users.id_user')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->select('users.name', 'users.last_name', DB::raw('count(attendance.id_attendance) as checkins'))
            ->groupBy('users.id_user', 'users.name', 'users.last_name')
            ->orderBy('checkins', 'desc')
            ->take(5)
            ->get();

        // 4. Course Utilization (Attendance / Max Capacity)
        $courseUtilization = DB::table('courses')
            ->join('sessions', 'courses.id_course', '=', 'sessions.id_course')
            ->leftJoin('attendance', 'sessions.id_session', '=', 'attendance.id_session')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->select(
                'courses.name',
                DB::raw('count(attendance.id_attendance) as total_attendance'),
                DB::raw('count(distinct sessions.id_session) as session_count'),
                'courses.max_capacity'
            )
            ->groupBy('courses.id_course', 'courses.name', 'courses.max_capacity')
            ->get()
            ->map(function($course) {
                $capacity_total = $course->session_count * $course->max_capacity;
                $course->utilization = $capacity_total > 0 
                    ? round(($course->total_attendance / $capacity_total) * 100, 1)
                    : 0;
                return $course;
            });

        // 5. Member Retention (Percentage of members with >1 session this month)
        $monthlyMembers = DB::table('attendance')
            ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->whereMonth('sessions.date_session', now()->month)
            ->select('attendance.id_member', DB::raw('count(*) as session_count'))
            ->groupBy('attendance.id_member')
            ->get();

        $totalUniqueMembers = $monthlyMembers->count();
        $returningMembers = $monthlyMembers->where('session_count', '>', 1)->count();
        $retentionRate = $totalUniqueMembers > 0 
            ? round(($returningMembers / $totalUniqueMembers) * 100, 1)
            : 0;

        // 6. Monthly Comparison
        $thisMonth = DB::table('attendance')
            ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->whereMonth('sessions.date_session', now()->month)
            ->whereYear('sessions.date_session', now()->year)
            ->count();

        $lastMonthDate = now()->subMonth();
        $lastMonth = DB::table('attendance')
            ->join('sessions', 'attendance.id_session', '=', 'sessions.id_session')
            ->join('courses', 'sessions.id_course', '=', 'courses.id_course')
            ->where('sessions.id_trainer', $user->id_user)
            ->when($gymId, function($q) use ($gymId) {
                return $q->where('courses.id_gym', $gymId);
            })
            ->whereMonth('sessions.date_session', $lastMonthDate->month)
            ->whereYear('sessions.date_session', $lastMonthDate->year)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'popularity' => $sessionPopularity,
                'trend' => $attendanceTrend,
                'engagement' => $memberEngagement,
                'utilization' => $courseUtilization,
                'retention' => [
                    'rate' => $retentionRate,
                    'total' => $totalUniqueMembers,
                    'returning' => $returningMembers
                ],
                'monthly' => [
                    'current' => $thisMonth,
                    'previous' => $lastMonth,
                    'growth' => $lastMonth > 0 ? round((($thisMonth - $lastMonth) / $lastMonth) * 100, 1) : 100
                ]
            ]
        ]);
    }
}
