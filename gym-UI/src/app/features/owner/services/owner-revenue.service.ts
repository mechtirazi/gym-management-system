import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdvancedRevenueStats } from '../../../shared/models/revenue.model';

@Injectable({
  providedIn: 'root'
})
export class OwnerRevenueService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches advanced revenue statistics.
   */
  getRevenueStats(filter: string = 'this_year'): Observable<AdvancedRevenueStats> {
    return this.http.get<AdvancedRevenueStats>(`${this.apiUrl}/owner/revenue-stats?filter=${filter}`);
  }
}
