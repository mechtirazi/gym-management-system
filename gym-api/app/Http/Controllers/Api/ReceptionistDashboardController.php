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
        $membersTotal = Enrollment::query()
            ->whereIn('id_gym', $gymIds)
            ->distinct('id_member')
            ->count('id_member');

        $activeEnrollments = Enrollment::query()
            ->whereIn('id_gym', $gymIds)
            ->where('status', 'active')
            ->count();

        // "Expiring soon": standard enrollments ending in next 7 days (assuming 30 days validity)
        $expiringSoon = Enrollment::query()
            ->whereIn('id_gym', $gymIds)
            ->where('status', 'active')
            ->where('type', 'standard')
            ->whereBetween('enrollment_date', [$today->copy()->subDays(30), $today->copy()->subDays(23)])
            ->count();

        // Payments
        $revenueToday = (float) Payment::query()
            ->whereIn('id_gym', $gymIds)
            ->whereDate('created_at', $today)
            ->sum('amount');

        $revenueThisMonth = (float) Payment::query()
            ->whereIn('id_gym', $gymIds)
            ->where('created_at', '>=', $monthStart)
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
        $recentCheckins = Attendance::with(['member:id_user,name,last_name', 'session:id_session,id_course', 'session.course:id_course,name,id_gym'])
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
                ],
                'upcomingSessions' => $upcomingSessions,
                'recentCheckins' => $recentCheckins,
                'generatedAt' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }
}

