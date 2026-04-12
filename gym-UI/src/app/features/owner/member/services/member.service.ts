import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

import { GymMember } from '../../../../shared/models/gym-member.model';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches members from the backend with server-side pagination and filtering.
   */
  getMembers(page: number = 1, perPage: number = 100, filters: any = {}): Observable<any> {
    let url = `${this.apiUrl}/enrollments?page=${page}&per_page=${perPage}`;
    
    if (filters.status && filters.status !== 'All') {
      url += `&status=${filters.status}`;
    }
    if (filters.search) {
      url += `&search=${filters.search}`;
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(url, { headers });
  }

  addMember(member: Partial<GymMember>): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<any>(`${this.apiUrl}/enrollments`, member, { headers });
  }

  updateMember(userId: string, member: Partial<GymMember>): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.put<any>(`${this.apiUrl}/users/${userId}`, member, { headers });
  }

  updateEnrollment(enrollmentId: string, enrollmentData: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.put<any>(`${this.apiUrl}/enrollments/${enrollmentId}`, enrollmentData, { headers });
  }

  deleteMember(id: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.delete(`${this.apiUrl}/enrollments/${id}`, { headers });
  }
}
