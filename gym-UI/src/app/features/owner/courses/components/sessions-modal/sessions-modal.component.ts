import { Component, inject, OnInit, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { finalize } from 'rxjs';
import { ConfirmDialogService } from '../../../../../shared/services/confirm-dialog.service';

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
  private confirmService = inject(ConfirmDialogService);

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

  todayDate = new Date().toISOString().split('T')[0];

  constructor() {
    this.sessionForm = this.fb.group({
      date_session: [new Date().toISOString().split('T')[0], [Validators.required, this.futureDateValidator]],
      start_time: ['10:00:00', [Validators.required, Validators.pattern(/^([0-2]?[0-9]):[0-5][0-9](:[0-5][0-9])?$/)]],
      end_time: ['11:00:00', [Validators.required, Validators.pattern(/^([0-2]?[0-9]):[0-5][0-9](:[0-5][0-9])?$/)]],
      id_trainer: ['', Validators.required],
      status: ['upcoming', Validators.required]
    }, { validators: [this.timeRangeValidator] });
  }

  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(value);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate >= today ? null : { pastDate: true };
  }

  // Custom validator to ensure start_time < end_time
  timeRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('start_time')?.value;
    const end = group.get('end_time')?.value;

    if (start && end) {
      if (start >= end) {
        return { timeRange: true };
      }
    }
    return null;
  }

  getFieldError(field: string): string | null {
    const control = this.sessionForm.get(field);
    if (control && control.touched && control.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['pattern']) return 'Invalid time format (HH:MM:SS)';
    }
    
    // Group-level errors
    if (field === 'timeRange' && this.sessionForm.touched && this.sessionForm.errors?.['timeRange']) {
      return 'Start time must be before end time';
    }

    return null;
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

    const value = { ...this.sessionForm.value };
    
    // Ensure HH:MM:SS format for backend date_format:H:i:s
    const formatTime = (time: string) => {
      if (!time) return time;
      const parts = time.split(':');
      if (parts.length === 2) return `${time}:00`;
      if (parts[0].length === 1) parts[0] = `0${parts[0]}`;
      return parts.join(':');
    };

    value.start_time = formatTime(value.start_time);
    value.end_time = formatTime(value.end_time);

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
    this.confirmService.open({
      title: 'Remove Session',
      message: 'Are you sure you want to remove this session?',
      confirmText: 'Remove Session',
      icon: 'event_busy',
      isDestructive: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.sessionService.deleteSession(id).subscribe({
          next: () => {
            this.sessionsUpdated.emit();
            this.loadData();
          },
          error: (err) => this.submitError.set('Delete failed.')
        });
      }
    });
  }

  toggleAttendanceStatus(attendance: any) {
    const nextStatus = attendance.status === 'present' ? 'absent' : 'present';
    this.sessionService.updateAttendance(attendance.id_attendance, { status: nextStatus }).subscribe({
      next: () => this.fetchAttendances(attendance.id_session),
      error: () => this.submitError.set('Failed to update attendance.')
    });
  }

  openPicker(event: any) {
    try {
      event.target.showPicker();
    } catch (e) {
      console.log('showPicker not supported');
    }
  }
}
