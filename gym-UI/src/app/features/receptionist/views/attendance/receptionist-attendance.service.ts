import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export type SessionDto = {
  id_session: string;
  id_course: string;
  id_trainer: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  course?: any;
};

export type AttendanceDto = {
  id_attendance: string;
  id_member: string;
  id_session: string;
  status: 'absent' | 'present' | 'late';
  member?: any;
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string } & Record<string, any>;

@Injectable({ providedIn: 'root' })
export class ReceptionistAttendanceService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  listCourses() {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/courses`).pipe(map((r: any) => r?.data ?? []));
  }

  listSessions(filters?: { id_course?: string; date_session?: string }) {
    let params = new HttpParams();
    if (filters?.id_course) {
      params = params.set('id_course', filters.id_course);
    }
    if (filters?.date_session) {
      params = params.set('date_session', filters.date_session);
    }
    return this.http.get<ApiResponse<SessionDto[]>>(`${this.apiUrl}/sessions`, { params }).pipe(map((r: any) => r?.data ?? []));
  }

  listAttendancesBySession(sessionId: string) {
    const params = new HttpParams().set('id_session', sessionId);
    return this.http
      .get<ApiResponse<AttendanceDto[]>>(`${this.apiUrl}/attendances`, { params })
      .pipe(map((r: any) => r?.data ?? []));
  }

  createAttendance(payload: { id_member: string; id_session: string; status: 'absent' | 'present' | 'late' }) {
    return this.http.post<ApiResponse<AttendanceDto>>(`${this.apiUrl}/attendances`, payload);
  }

  updateAttendance(id_attendance: string, payload: Partial<{ status: 'absent' | 'present' | 'late' }>) {
    return this.http.put<ApiResponse<AttendanceDto>>(`${this.apiUrl}/attendances/${id_attendance}`, payload);
  }
}

