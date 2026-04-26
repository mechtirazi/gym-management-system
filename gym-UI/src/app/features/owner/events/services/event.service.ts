import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // NOTE: No manual authHeaders needed here.
  // The JwtInterceptor automatically attaches:
  //   - Authorization: Bearer <token>
  //   - X-Gym-Id: <active gym id>
  // to every HTTP request, ensuring the backend scopes data correctly.

  getEvents(page: number = 1, perPage: number = 9): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/events?page=${page}&per_page=${perPage}`);
  }

  private prepareFormData(data: FormData): FormData {
    const activeGymId = this.authService.connectedGymId();
    if (!activeGymId) {
      throw new Error('No active gym selected. Please switch to a gym first.');
    }
    if (!data.has('id_gym')) {
      data.append('id_gym', activeGymId.toString());
    }
    return data;
  }

  createEvent(eventData: FormData): Observable<any> {
    const data = this.prepareFormData(eventData);
    return this.http.post<any>(`${this.apiUrl}/events`, data);
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/events/${id}`);
  }

  updateEvent(id: string, eventData: FormData): Observable<any> {
    const data = this.prepareFormData(eventData);
    // For multipart/form-data PUT requests, use POST with _method=PUT
    data.append('_method', 'PUT');
    return this.http.post(`${this.apiUrl}/events/${id}`, data);
  }

  getEventAttendances(eventId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/attendance-events?id_event=${eventId}`).pipe(
      map(res => res?.data || [])
    );
  }

  updateEventAttendance(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/attendance-events/${id}`, data).pipe(
      map(res => res?.data)
    );
  }
}
