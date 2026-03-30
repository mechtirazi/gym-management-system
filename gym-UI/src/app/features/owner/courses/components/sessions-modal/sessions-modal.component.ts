import { Component, inject, OnInit, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-sessions-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sessions-modal.component.html',
  styleUrl: './sessions-modal.component.scss'
})
export class SessionsModalComponent implements OnInit {
  private sessionService = inject(SessionService);
  private fb = inject(FormBuilder);

  course = input.required<any>();
  close = output<void>();
  sessionsUpdated = output<void>();

  sessions = signal<any[]>([]);
  trainers = signal<any[]>([]);
  attendances = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  isLoadingAttendances = signal<boolean>(false);
  
  // Form visibility and mode
  showForm = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingSessionId = signal<string | null>(null);
  
  isSubmitting = signal<boolean>(false);
  submitError = signal<string | null>(null);

  sessionForm: FormGroup;

  constructor() {
    this.sessionForm = this.fb.group({
      date_session: [new Date().toISOString().split('T')[0], Validators.required],
      start_time: ['10:00:00', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)]],
      end_time: ['11:00:00', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)]],
      id_trainer: ['', Validators.required],
      status: ['upcoming', Validators.required]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.sessionService.getCourseSessions(this.course().id_course || this.course().id).subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.sessionService.getTrainers().subscribe({
      next: (data) => this.trainers.set(data),
      error: () => {}
    });
  }

  toggleAddForm() {
    this.isEditing.set(false);
    this.editingSessionId.set(null);
    this.sessionForm.reset({
      date_session: new Date().toISOString().split('T')[0],
      start_time: '10:00:00',
      end_time: '11:00:00',
      status: 'upcoming'
    });
    this.attendances.set([]);
    this.showForm.set(!this.showForm());
  }

  editSession(session: any) {
    this.isEditing.set(true);
    this.editingSessionId.set(session.id_session);
    this.sessionForm.patchValue({
      date_session: session.date_session,
      start_time: session.start_time,
      end_time: session.end_time,
      id_trainer: session.id_trainer,
      status: session.status
    });
    this.fetchAttendances(session.id_session);
    this.showForm.set(true);
  }

  fetchAttendances(sessionId: string) {
    this.isLoadingAttendances.set(true);
    this.sessionService.getSessionAttendances(sessionId).subscribe({
      next: (data) => {
        this.attendances.set(data);
        this.isLoadingAttendances.set(false);
      },
      error: () => this.isLoadingAttendances.set(false)
    });
  }

  submitForm() {
    this.submitError.set(null);
    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    const value = this.sessionForm.value;
    const payload = {
      ...value,
      id_course: this.course().id_course || this.course().id
    };

    this.isSubmitting.set(true);
    const request = this.isEditing() 
      ? this.sessionService.updateSession(this.editingSessionId()!, payload)
      : this.sessionService.addSession(payload);

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showForm.set(false);
        this.sessionsUpdated.emit();
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.submitError.set(err.error?.message || 'Operation failed.');
      }
    });
  }

  deleteSession(id: string) {
    if (!confirm('Remove this session?')) return;
    this.sessionService.deleteSession(id).subscribe({
      next: () => {
        this.sessionsUpdated.emit();
        this.loadData();
      },
      error: (err) => alert('Delete failed.')
    });
  }

  toggleAttendanceStatus(attendance: any) {
    const nextStatus = attendance.status === 'present' ? 'absent' : 'present';
    this.sessionService.updateAttendance(attendance.id_attendance, { status: nextStatus }).subscribe({
      next: () => this.fetchAttendances(attendance.id_session),
      error: () => alert('Failed to update attendance.')
    });
  }
}
