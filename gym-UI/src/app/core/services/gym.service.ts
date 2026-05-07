import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GymInfo } from '../models/api.models';

export interface GymsResponse {
  success: boolean;
  data: GymInfo[];
}

@Injectable({
  providedIn: 'root'
})
export class GymService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMyGyms(): Observable<GymInfo[]> {
    return this.http.get<GymsResponse>(`${this.apiUrl}/gyms`).pipe(
      map(res => res.data || []),
      catchError(() => of([]))
    );
  }

  getGymById(id: string): Observable<GymInfo | null> {
    return this.http.get<{ success: boolean, data: GymInfo }>(`${this.apiUrl}/gyms/${id}`).pipe(
      map(res => res.data),
      catchError(() => of(null))
    );
  }

  reactivateGym(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/gyms/${id}/reactivate`, {});
  }

  renewPlatformSubscription(gymId: string, type: string, paymentMethod: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/owner/gyms/${gymId}/renew`, { type, payment_method: paymentMethod });
  }
}
export type { GymInfo };
