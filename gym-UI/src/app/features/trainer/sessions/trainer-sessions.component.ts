import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs/operators';
import { TrainerService } from '../services/trainer.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-trainer-sessions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './trainer-sessions.component.html',
  styleUrl: './trainer-sessions.component.scss'
})
export class TrainerSessionsComponent implements OnInit {
  private http = inject(HttpClient);
  private trainerService = inject(TrainerService);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  activeGymId = this.authService.connectedGymId;

  sessions = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  selectedSession = signal<any | null>(null);
  attendances = signal<any[]>([]);
  isLoadingAttendances = signal<boolean>(false);
  attendanceError = signal<string | null>(null);

  // Filtering
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('All');

  filteredSessions = computed(() => {
    let list = this.sessions();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();

    if (status !== 'All') {
      list = list.filter(s => (s.status || '').toLowerCase() === status.toLowerCase());
    }

    if (query) {
      list = list.filter(s =>
        (s.course?.name || '').toLowerCase().includes(query) ||
        (s.date_session || '').includes(query)
      );
    }
    return list;
  });

  private get authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    this.loadSessions();
  }


  loadSessions() {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/sessions`, { headers: this.authHeaders })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          const data = res?.data || res || [];
          this.sessions.set(Array.isArray(data) ? data : []);
        },
        error: (err) => {
          console.error('Failed to load sessions:', err);
          this.error.set('Could not fetch your schedule. Please try again.');
        }
      });
  }


  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-default';
    return `status-${status.toLowerCase()}`;
  }

  viewAttendance(session: any) {
    this.selectedSession.set(session);
    this.isLoadingAttendances.set(true);
    this.attendanceError.set(null);
    this.attendances.set([]);

    const sessionId = session.id_session || session.id;
    this.http.get<any>(`${this.apiUrl}/attendances?id_session=${sessionId}`, { headers: this.authHeaders })
      .subscribe({
        next: (res) => {
          this.attendances.set(res?.data || []);
          this.isLoadingAttendances.set(false);
        },
        error: (err) => {
          console.error(err);
          this.attendanceError.set('Could not load attendances.');
          this.isLoadingAttendances.set(false);
        }
      });
  }

  closeAttendance() {
    this.selectedSession.set(null);
    this.attendances.set([]);
  }

  toggleAttendanceStatus(attendance: any) {
    const nextStatus = attendance.status === 'present' ? 'absent' : 'present';
    this.http.put<any>(`${this.apiUrl}/attendances/${attendance.id_attendance}`, { status: nextStatus }, { headers: this.authHeaders })
      .subscribe({
        next: () => {
          // Re-fetch attendances or manually update the list element:
          const updated = this.attendances().map(a =>
            a.id_attendance === attendance.id_attendance ? { ...a, status: nextStatus } : a
          );
          this.attendances.set(updated);
        },
        error: (err) => {
          console.error(err);
          this.attendanceError.set('Failed to update attendance status.');
        }
      });
  }
}
