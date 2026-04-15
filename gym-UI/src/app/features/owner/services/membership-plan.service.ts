import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MembershipPlan {
  id?: string;
  name: string;
  price: number;
  duration_days: number;
  description?: string;
  type: 'trial' | 'standard' | 'premium';
}

@Injectable({
  providedIn: 'root'
})
export class MembershipPlanService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/owner`;

  getPlans(gymId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gyms/${gymId}/plans`);
  }

  createPlan(gymId: string, plan: MembershipPlan): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/gyms/${gymId}/plans`, plan);
  }

  updatePlan(planId: string, plan: Partial<MembershipPlan>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/plans/${planId}`, plan);
  }

  deletePlan(planId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/plans/${planId}`);
  }
}
