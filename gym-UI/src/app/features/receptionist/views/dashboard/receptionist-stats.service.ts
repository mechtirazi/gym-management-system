import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export type ReceptionistDashboardStatsDto = {
  success: boolean;
  data?: {
    scope: { gymIds: string[]; activeGymId?: string | null };
    kpis: {
      membersTotal: number;
      activeEnrollments: number;
      expiringEnrollmentsSoon: number;
      checkinsToday: number;
      sessionsToday: number;
      activeEvents: number;
      paymentsToday: number;
      revenueToday: number;
      revenueThisMonth: number;
    };
    upcomingSessions: Array<{
      id_session: string;
      date_session?: string;
      start_time?: string;
      end_time?: string;
      status?: string;
      course?: { id_course?: string; name?: string; id_gym?: string };
      trainer?: { id_user?: string; name?: string } | null;
    }>;
    recentCheckins: Array<{
      id_attendance: string;
      memberName: string;
      status: string;
      created_at?: string;
      session?: { id_session?: string; courseName?: string };
    }>;
    generatedAt: string;
  };
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class ReceptionistStatsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getDashboardStats() {
    return this.http.get<ReceptionistDashboardStatsDto>(`${this.apiUrl}/receptionist/dashboard-stats`).pipe(
      map((res) => {
        if (!res?.success || !res.data) {
          throw new Error(res?.message || 'Failed to load receptionist dashboard stats');
        }
        return res.data;
      }),
      catchError((err) => {
        // If backend endpoint isn't available, fail loudly (stats must be "real")
        throw err;
      })
    );
  }
}

