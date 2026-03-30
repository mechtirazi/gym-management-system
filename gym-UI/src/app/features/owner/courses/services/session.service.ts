import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private get authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getCourseSessions(idCourse: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sessions`, { headers: this.authHeaders }).pipe(
      map(res => {
          const sessions = res?.data || [];
          return sessions.filter((s: any) => s.id_course === idCourse);
      })
    );
  }

  addSession(session: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sessions`, session, { headers: this.authHeaders });
  }

  updateSession(id: string, session: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/sessions/${id}`, session, { headers: this.authHeaders });
  }

  deleteSession(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sessions/${id}`, { headers: this.authHeaders });
  }
  
  getTrainers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gym-staff`, { headers: this.authHeaders }).pipe(
      map(res => {
        const staff = res?.data || [];
        return staff.filter((s: any) => (s.user?.role || '').toLowerCase().includes('trainer'));
      })
    );
  }

  getSessionAttendances(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/attendances?id_session=${sessionId}`, { headers: this.authHeaders }).pipe(
      map(res => res?.data || [])
    );
  }

  updateAttendance(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/attendances/${id}`, data, { headers: this.authHeaders }).pipe(
      map(res => res?.data)
    );
  }
}
