<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Session;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReceptionistDashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();

        if (! $user instanceof User || $user->role !== User::ROLE_RECEPTIONIST) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: receptionist privileges required.',
            ], 403);
        }

        $allowedGymIds = $user->allowedGymIds() ?? collect();
        $activeGymId = $request->header('X-Gym-Id');
        $gymIds = $allowedGymIds->values();

        if ($activeGymId && $allowedGymIds->contains($activeGymId)) {
            $gymIds = collect([$activeGymId]);
        }

        $today = Carbon::today();
        $monthStart = Carbon::now()->startOfMonth();

        // Members/enrollments
        // Total unique members who have ever enrolled
        $membersTotal = Enrollment::query()
            ->whereIn('id_gym', $gymIds)
            ->whereNotNull('id_plan')
            ->distinct('id_member')
            ->count('id_member');

        // Unique members with at least one 'active' enrollment that hasn't reached its end date
        $activeEnrollments = Enrollment::query()
            ->leftJoin('membership_plans', 'enrollments.id_plan', '=', 'membership_plans.id')
            ->whereIn('enrollments.id_gym', $gymIds)
            ->where('enrollments.status', 'active')
            ->whereNotNull('enrollments.id_plan')
            ->where(function ($q) use ($today) {
                // If it has a plan, use plan duration. Otherwise fallback to 30 days (standard) or 90 days (premium)
                $q->whereRaw('DATE_ADD(enrollments.enrollment_date, INTERVAL COALESCE(membership_plans.duration_days, CASE WHEN enrollments.type = "premium" THEN 90 ELSE 30 END) DAY) >= ?', [$today->toDateString()]);
            })
            ->distinct('id_member')
            ->count('id_member');

        // "Expiring soon": enrollments ending in the next 7 days
        $expiringSoon = Enrollment::query()
            ->leftJoin('membership_plans', 'enrollments.id_plan', '=', 'membership_plans.id')
            ->whereIn('enrollments.id_gym', $gymIds)
            ->where('enrollments.status', 'active')
            ->whereNotNull('enrollments.id_plan')
            ->where(function ($q) use ($today) {
                $q->whereRaw('DATE_ADD(enrollments.enrollment_date, INTERVAL COALESCE(membership_plans.duration_days, CASE WHEN enrollments.type = "premium" THEN 90 ELSE 30 END) DAY) BETWEEN ? AND ?', [
                    $today->toDateString(),
                    $today->copy()->addDays(7)->toDateString()
                ]);
            })
            ->distinct('id_member')
            ->count('id_member');

        // Payments
        $revenueToday = (float) Payment::query()
            ->whereIn('id_gym', $gymIds)
            ->whereDate('created_at', $today)
            ->sum('amount');

        $revenueThisMonth = (float) Payment::query()
            ->whereIn('id_gym', $gymIds)
            ->whereMonth('created_at', $today->month)
            ->whereYear('created_at', $today->year)
            ->sum('amount');

        $paymentsToday = Payment::query()
            ->whereIn('id_gym', $gymIds)
            ->whereDate('created_at', $today)
            ->count();

        // Attendance/check-ins (present or late)
        $checkinsToday = Attendance::query()
            ->whereHas('session.course', function ($q) use ($gymIds) {
                $q->whereIn('id_gym', $gymIds);
            })
            ->whereIn('status', [Attendance::STATUS_PRESENT, Attendance::STATUS_LATE])
            ->whereDate('created_at', $today)
            ->count();

        // Sessions (today + upcoming)
        $sessionsToday = Session::query()
            ->whereHas('course', function ($q) use ($gymIds) {
                $q->whereIn('id_gym', $gymIds);
            })
            ->whereDate('date_session', $today)
            ->count();

        $upcomingSessions = Session::with(['course:id_course,name,id_gym', 'trainer:id_user,name,last_name'])
            ->whereHas('course', function ($q) use ($gymIds) {
                $q->whereIn('id_gym', $gymIds);
            })
            ->where(function ($q) use ($today) {
                $q->whereDate('date_session', '>', $today)
                    ->orWhere(function ($q2) use ($today) {
                        $q2->whereDate('date_session', $today)
                            ->whereTime('start_time', '>=', Carbon::now()->format('H:i:s'));
                    });
            })
            ->orderBy('date_session')
            ->orderBy('start_time')
            ->take(5)
            ->get()
            ->map(function (Session $s) {
                return [
                    'id_session' => $s->id_session,
                    'date_session' => $s->date_session,
                    'start_time' => $s->start_time,
                    'end_time' => $s->end_time,
                    'status' => $s->status,
                    'course' => [
                        'id_course' => $s->course?->id_course,
                        'name' => $s->course?->name,
                        'id_gym' => $s->course?->id_gym,
                    ],
                    'trainer' => $s->trainer ? [
                        'id_user' => $s->trainer->id_user,
                        'name' => trim(($s->trainer->name ?? '').' '.($s->trainer->last_name ?? '')),
                    ] : null,
                ];
            })
            ->values();

        // Events
        $activeEvents = Event::query()
            ->whereIn('id_gym', $gymIds)
            ->whereDate('end_date', '>=', $today)
            ->count();

        // Recent check-ins list
        $recentCheckins = Attendance::with(['member:id_user,name,last_name,profile_picture', 'session:id_session,id_course', 'session.course:id_course,name,id_gym'])
            ->whereHas('session.course', function ($q) use ($gymIds) {
                $q->whereIn('id_gym', $gymIds);
            })
            ->whereIn('status', [Attendance::STATUS_PRESENT, Attendance::STATUS_LATE])
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(function (Attendance $a) {
                $memberName = $a->member ? trim(($a->member->name ?? '').' '.($a->member->last_name ?? '')) : $a->id_member;
                return [
                    'id_attendance' => $a->id_attendance,
                    'memberName' => $memberName,
                    'status' => $a->status,
                    'created_at' => $a->created_at,
                    'session' => [
                        'id_session' => $a->session?->id_session,
                        'courseName' => $a->session?->course?->name,
                    ],
                    'avatar' => $a->member?->profile_picture ? (str_starts_with($a->member->profile_picture, 'http') ? $a->member->profile_picture : asset('storage/' . $a->member->profile_picture)) : null,
                ];
            })
            ->values();

        // Recent Transactions
        $recentTransactions = Payment::with(['user:id_user,name,last_name,profile_picture'])
            ->whereIn('id_gym', $gymIds)
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(function (Payment $p) {
                $memberName = $p->user ? trim(($p->user->name ?? '').' '.($p->user->last_name ?? '')) : 'Guest/Product';
                return [
                    'id_payment' => $p->id_payment,
                    'memberName' => $memberName,
                    'amount' => $p->amount,
                    'type' => $p->type,
                    'created_at' => $p->created_at,
                    'avatar' => $p->user?->profile_picture ? (str_starts_with($p->user->profile_picture, 'http') ? $p->user->profile_picture : asset('storage/' . $p->user->profile_picture)) : null,
                ];
            })
            ->values();

        // Expiring Members List
        $expiringMembers = Enrollment::with(['member:id_user,name,last_name,profile_picture'])
            ->leftJoin('membership_plans', 'enrollments.id_plan', '=', 'membership_plans.id')
            ->whereIn('enrollments.id_gym', $gymIds)
            ->where('enrollments.status', 'active')
            ->whereNotNull('enrollments.id_plan')
            ->whereRaw('DATE_ADD(enrollments.enrollment_date, INTERVAL COALESCE(membership_plans.duration_days, 30) DAY) BETWEEN ? AND ?', [
                $today->toDateString(),
                $today->copy()->addDays(7)->toDateString()
            ])
            ->select('enrollments.*') // Avoid column collision
            ->take(5)
            ->get()
            ->map(function ($e) {
                return [
                    'memberName' => $e->member ? trim(($e->member->name ?? '').' '.($e->member->last_name ?? '')) : 'Unknown',
                    'type' => $e->type,
                    'avatar' => $e->member?->profile_picture ? (str_starts_with($e->member->profile_picture, 'http') ? $e->member->profile_picture : asset('storage/' . $e->member->profile_picture)) : null,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'scope' => [
                    'gymIds' => $gymIds->values(),
                    'activeGymId' => $activeGymId,
                ],
                'kpis' => [
                    'membersTotal' => $membersTotal,
                    'activeEnrollments' => $activeEnrollments,
                    'expiringEnrollmentsSoon' => $expiringSoon,
                    'checkinsToday' => $checkinsToday,
                    'sessionsToday' => $sessionsToday,
                    'activeEvents' => $activeEvents,
                    'paymentsToday' => $paymentsToday,
                    'revenueToday' => $revenueToday,
                    'revenueThisMonth' => $revenueThisMonth,
                    'revenueTotal' => (float) Payment::query()->whereIn('id_gym', $gymIds)->sum('amount'),
                ],
                'upcomingSessions' => $upcomingSessions,
                'recentCheckins' => $recentCheckins,
                'recentTransactions' => $recentTransactions,
                'expiringMembers' => $expiringMembers,
                'generatedAt' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }
}

