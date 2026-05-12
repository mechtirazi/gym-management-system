import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdvancedRevenueStats } from '../../../shared/models/revenue.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OwnerRevenueService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches advanced revenue statistics.
   */
  getRevenueStats(filter: string = 'this_year'): Observable<AdvancedRevenueStats> {
    const params = new HttpParams().set('filter', filter);
    let headers = new HttpHeaders();

    const activeGymId = this.authService.connectedGymId();
    if (activeGymId) {
      headers = headers.set('X-Gym-Id', activeGymId.toString());
    }

    return this.http.get<AdvancedRevenueStats>(`${this.apiUrl}/owner/revenue-stats`, { params, headers });
  }
}
