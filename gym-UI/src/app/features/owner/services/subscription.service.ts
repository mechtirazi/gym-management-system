import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Subscription, SubscriptionResponse } from '../../../shared/models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private get authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  /**
   * Fetches all subscriptions for the owner's gyms.
   */
  getSubscriptions(): Observable<Subscription[]> {
    return this.http.get<any>(`${this.apiUrl}/subscribes`, { headers: this.authHeaders }).pipe(
      map(response => {
        if (response && response.data) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      }),
      catchError(error => {
        console.error('Error fetching subscriptions:', error);
        return of([]);
      })
    );
  }

  /**
   * Updates a subscription's status.
   */
  updateStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/subscribes/${id}`, { status }, { headers: this.authHeaders });
  }

  /**
   * Cancels a subscription.
   */
  cancelSubscription(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/subscribes/${id}`, { headers: this.authHeaders });
  }
}
