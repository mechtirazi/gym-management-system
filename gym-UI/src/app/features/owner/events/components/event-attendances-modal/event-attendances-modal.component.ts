import { Component, inject, OnInit, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-event-attendances-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './event-attendances-modal.component.html',
  styleUrl: './event-attendances-modal.component.scss'
})
export class EventAttendancesModalComponent implements OnInit {
  private eventService = inject(EventService);
  private fb = inject(FormBuilder);

  eventModel = input.required<any>();
  close = output<void>();
  eventUpdated = output<void>();

  attendances = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  isLoadingAttendances = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  submitError = signal<string | null>(null);
  
  // Tab state
  activeTab = signal<'details' | 'attendance'>('details');

  eventForm: FormGroup;

  constructor() {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      max_participants: [0, [Validators.required, Validators.min(1)]],
      is_rewarded: [false],
      reward_amount: [0],
      max_winners: [1]
    });
  }

  ngOnInit() {
    this.initForm();
    this.loadAttendances();
  }

  initForm() {
    const e = this.eventModel();
    this.eventForm.patchValue({
      title: e.title,
      description: e.description,
      start_date: e.start_date ? e.start_date.split('T')[0] : '',
      end_date: e.end_date ? e.end_date.split('T')[0] : '',
      max_participants: e.max_participants,
      is_rewarded: e.is_rewarded || false,
      reward_amount: e.reward_amount || 0,
      max_winners: e.max_winners || 1
    });
  }

  loadAttendances() {
    this.isLoadingAttendances.set(true);
    this.eventService.getEventAttendances(this.eventModel().id_event).subscribe({
      next: (data) => {
        this.attendances.set(data);
        this.isLoadingAttendances.set(false);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoadingAttendances.set(false);
        this.isLoading.set(false);
      }
    });
  }

  submitForm() {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    this.eventService.updateEvent(this.eventModel().id_event, this.eventForm.value)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.eventUpdated.emit();
          // Stay in modal but show success? Or just keep it as is.
          alert('Event updated successfully!');
        },
        error: (err) => {
          this.submitError.set(err.error?.message || 'Update failed.');
        }
      });
  }

  toggleAttendanceStatus(attendance: any) {
    const nextStatus = attendance.status === 'completed' ? 'cancelled' : 'completed';
    this.eventService.updateEventAttendance(attendance.id_attendance_event, { status: nextStatus }).subscribe({
      next: () => this.loadAttendances(),
      error: () => alert('Update failed.')
    });
  }

  rewardAttendee(attendance: any) {
    if (!confirm(`Are you sure you want to award the reward point to ${attendance.member?.name}? This action cannot be undone.`)) {
      return;
    }

    this.eventService.rewardWinnerEvent(attendance.id_attendance_event).subscribe({
      next: (res) => {
        alert(res.message || 'Reward synchronized successfully!');
        this.loadAttendances();
      },
      error: (err) => {
        alert(err.error?.message || 'Reward failed.');
      }
    });
  }
}
