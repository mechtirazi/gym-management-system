import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, GymDto } from '../models/api.models';

export interface PlatformMetrics {
  total_active_gyms: number;
  total_active_members: number;
  mrr: number;
  recent_churn: number;
}

export interface RevenueTrendItem {
  month: string;
  revenue: number;
}

export interface RevenueAnalytics {
  mrr: number;
  basic_gyms_count: number;
  pro_gyms_count: number;
  revenue_trend: RevenueTrendItem[];
  at_risk_revenue?: number;
  churned_revenue?: number;
  expiring_gyms?: GymDto[];
}

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private http = inject(HttpClient);

  getPlatformMetrics(): Observable<PlatformMetrics> {
    return this.http.get<ApiResponse<PlatformMetrics>>(
      `${environment.apiUrl}/admin/metrics/overview`
    ).pipe(
      map(res => res.data as PlatformMetrics)
    );
  }

  getRevenueAnalytics(): Observable<RevenueAnalytics> {
    return this.http.get<ApiResponse<RevenueAnalytics>>(
      `${environment.apiUrl}/admin/analytics/revenue`
    ).pipe(
      map(res => res.data as RevenueAnalytics)
    );
  }
}
