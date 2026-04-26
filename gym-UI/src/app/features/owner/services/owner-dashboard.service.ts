import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

import { DashboardStats, DashboardData, Checkin, RevenueData, ActivityTrend } from '../../../shared/models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class OwnerDashboardService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches the 4 top-level widgets values.
   */
  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/owner/dashboard-stats`);
  }

  /**
   * Fetches the chart data.
   */
  getRevenueChartData(filter: string = 'this_year'): Observable<RevenueData[]> {
    return this.http.get<RevenueData[]>(`${this.apiUrl}/owner/revenue-chart?filter=${filter}`);
  }

  /**
   * Fetches the activity trends chart data.
   */
  getActivityChartData(): Observable<ActivityTrend[]> {
    return this.http.get<ActivityTrend[]>(`${this.apiUrl}/owner/activity-chart`);
  }

  /**
   * Fetches the recent check-ins array from the backend.
   */
  getRecentCheckins(): Observable<Checkin[]> {
    return this.http.get<Checkin[]>(`${this.apiUrl}/owner/recent-checkins`);
  }

  /**
   * Posts a new member to the backend.
   */
  addMember(memberData: { 
    firstName: string, 
    lastName: string, 
    email: string, 
    phone: string, 
    password: string,
    id_plan: string,
    startDate: string
  }): Observable<any> {

    // Auto-generate the precise creation_date timestamp expected by the DB (YYYY-MM-DD HH:mm:ss)
    const now = new Date();
    const creation_date = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const gymId = this.authService.currentUser()?.gym_id;

    const payload = {
      name: memberData.firstName,
      last_name: memberData.lastName,
      email: memberData.email,
      role: 'member', // Using standard 'member' role
      password: memberData.password,
      phone: memberData.phone,
      creation_date: creation_date,
      id_gym: gymId,
      id_plan: memberData.id_plan,
      enrollment_date: memberData.startDate
    };

    return this.http.post(`${this.apiUrl}/users`, payload);
  }
}
