import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TrainerService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trainer/dashboard-stats`);
  }

  getUpcomingSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/trainer/upcoming-sessions`);
  }

  getCourses(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses`);
  }

  getNutritionPlans(page: number, perPage: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/nutrition-plans?page=${page}&per_page=${perPage}`);
  }

  getClients(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trainer/clients`);
  }

  createClient(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users`, { ...data, role: 'member' });
  }

  updateClient(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/users/${id}`, data);
  }

  getEnrollments(memberId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/enrollments?id_member=${memberId}`);
  }

  sendBroadcast(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/trainer/broadcast`, data);
  }

  getAttendances(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/attendances`);
  }

  getSessions(start: string, end: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trainer/sessions?start=${start}&end=${end}`);
  }

  getAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trainer/analytics`);
  }
}
