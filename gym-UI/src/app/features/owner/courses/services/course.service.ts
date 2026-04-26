import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // NOTE: No manual authHeaders needed here.
  // The JwtInterceptor automatically attaches:
  //   - Authorization: Bearer <token>
  //   - X-Gym-Id: <active gym id>
  // to every HTTP request, ensuring the backend scopes data correctly.

  getCourses(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses`);
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

  createCourse(courseData: FormData): Observable<any> {
    const data = this.prepareFormData(courseData);
    return this.http.post(`${this.apiUrl}/courses`, data);
  }

  updateCourse(id: string, courseData: FormData): Observable<any> {
    const data = this.prepareFormData(courseData);
    // Method spoofing for PUT since it's FormData
    data.append('_method', 'PUT');
    return this.http.post(`${this.apiUrl}/courses/${id}`, data);
  }

  deleteCourse(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/courses/${id}`);
  }

  getTrainers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gym-staff`);
  }
}
