import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

import { GymMember } from '../../../../shared/models/gym-member.model';
import { AuthService } from '../../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private get authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const gymId = this.authService.currentUser()?.gym_id;
    let headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    if (gymId) {
      headers = headers.set('X-Gym-Id', gymId.toString());
    }
    return headers;
  }

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

    return this.http.get<any>(url, { headers: this.authHeaders });
  }

  addMember(member: Partial<GymMember>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/enrollments`, member, { headers: this.authHeaders });
  }

  updateMember(userId: string, member: Partial<GymMember>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${userId}`, member, { headers: this.authHeaders });
  }

  updateEnrollment(enrollmentId: string, enrollmentData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/enrollments/${enrollmentId}`, enrollmentData, { headers: this.authHeaders });
  }

  deleteMember(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/enrollments/${id}`, { headers: this.authHeaders });
  }
}
