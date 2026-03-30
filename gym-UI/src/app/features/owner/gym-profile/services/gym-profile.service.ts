import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

import { Gym } from '../../../../shared/models/gym.model';

@Injectable({
  providedIn: 'root'
})
export class GymProfileService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches all gyms from the backend.
   */
  getAllGyms(): Observable<Gym[]> {
    // Modify URL if your backend endpoint naturally implies /gyms
    return this.http.get<Gym[]>(`${this.apiUrl}/gyms`);
  }

  /**
   * Updates a specific gym.
   */
  updateGym(gymId: string | number, data: Partial<Gym> | FormData): Observable<any> {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return this.http.post<any>(`${this.apiUrl}/gyms/${gymId}`, data);
    }
    return this.http.put<any>(`${this.apiUrl}/gyms/${gymId}`, data);
  }
}
