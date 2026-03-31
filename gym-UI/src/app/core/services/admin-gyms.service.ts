import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, GymDto } from '../models/api.models';
export type { GymDto };

@Injectable({ providedIn: 'root' })
export class AdminGymsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/gyms`;

  getGyms(): Observable<GymDto[]> {
    return this.http.get<ApiResponse<GymDto[]>>(this.baseUrl).pipe(
      map(res => res.data || [])
    );
  }

  suspendGym(id_gym: string, reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id_gym}/suspend`, { suspension_reason: reason });
  }

  activateGym(id_gym: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id_gym}/activate`, {});
  }

  renewGym(id_gym: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id_gym}/renew`, {});
  }
}
