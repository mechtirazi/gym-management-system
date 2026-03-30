import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

import { Membership } from '../../../../shared/models/membership.model';

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getSubscriptions(page: number = 1, perPage: number = 9, filters: any = {}): Observable<any> {
    let url = `${this.apiUrl}/enrollments?page=${page}&per_page=${perPage}`;
    
    if (filters.status && filters.status !== 'All') {
      url += `&status=${filters.status}`;
    }
    if (filters.search) {
      url += `&search=${filters.search}`;
    }
    
    return this.http.get<any>(url);
  }

  deleteSubscription(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/enrollments/${id}`);
  }

  addMembership(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/enrollments`, data);
  }

  updateMembership(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/enrollments/${id}`, data);
  }

  getUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users`);
  }
}
