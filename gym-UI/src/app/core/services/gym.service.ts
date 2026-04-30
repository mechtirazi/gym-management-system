import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GymInfo {
  id_gym: string;
  name: string;
  address: string;
  phone: string;
  id_owner: string;
  logo_url?: string;
  status?: string;
  suspension_reason?: string;
  // Subscription fields
  subscription_end?: string;
  days_remaining?: number;
}

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
}
