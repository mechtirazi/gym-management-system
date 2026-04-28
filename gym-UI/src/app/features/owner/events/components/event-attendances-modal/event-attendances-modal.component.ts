import { Component, inject, OnInit, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { finalize } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { EventModel } from '../../../../../shared/models/event.model';

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

  /** Pass an existing event to switch to Manage/Edit mode. If null, modal acts as 'Add New Event' */
  eventModel = input<EventModel | null>(null);
  
  close = output<void>();
  eventUpdated = output<void>();

  attendances = signal<any[]>([]);
  isLoadingAttendances = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  submitError = signal<string | null>(null);
  
  // Image handling
  selectedFile: File | null = null;
  imagePreview = signal<string | null>(null);

  // Tab state
  activeTab = signal<'details' | 'attendance'>('details');

  eventForm: FormGroup;

  isEditMode = computed(() => !!this.eventModel());

  constructor() {
    this.eventForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      start_date: ['', Validators.required],
      start_time: [''],
      end_date: ['', Validators.required],
      end_time: [''],
      max_participants: [50, [Validators.required, Validators.min(1)]],
      ignore_max_capacity: [false],
      price: [0, [Validators.required, Validators.min(0)]],
      is_rewarded: [false],
      reward_amount: [0, [Validators.min(0)]],
      max_winners: [1, [Validators.min(1)]]
    });

    // Handle capacity toggle
    this.eventForm.get('ignore_max_capacity')?.valueChanges.subscribe(val => {
      const control = this.eventForm.get('max_participants');
      if (val) {
        control?.disable();
      } else {
        control?.enable();
      }
    });
  }

  ngOnInit() {
    const existing = this.eventModel();
    if (existing) {
      this.initForm(existing);
      this.loadAttendances();
    } else {
      this.activeTab.set('details');
    }
  }

  initForm(e: EventModel) {
    this.eventForm.patchValue({
      title: e.title,
      description: e.description,
      start_date: e.start_date ? e.start_date.toString().split('T')[0] : '',
      start_time: e.start_time || '',
      end_date: e.end_date ? e.end_date.toString().split('T')[0] : '',
      end_time: e.end_time || '',
      max_participants: e.max_participants >= 999999 ? 0 : e.max_participants,
      ignore_max_capacity: e.max_participants >= 999999,
      price: e.price || 0,
      is_rewarded: e.is_rewarded || false,
      reward_amount: e.reward_amount || 0,
      max_winners: e.max_winners || 1
    });

    if (e.max_participants >= 999999) {
      this.eventForm.get('max_participants')?.disable();
    }

    const rawImage = e.image_url || (e as any).image;
    if (rawImage) {
      this.imagePreview.set(this.getImageUrl(rawImage));
    }
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview.set(null);
  }

  loadAttendances() {
    const eventId = this.eventModel()?.id_event;
    if (!eventId) return;

    this.isLoadingAttendances.set(true);
    this.eventService.getEventAttendances(eventId).subscribe({
      next: (data) => {
        this.attendances.set(data);
        this.isLoadingAttendances.set(false);
      },
      error: () => this.isLoadingAttendances.set(false)
    });
  }

  submitForm() {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    Object.keys(this.eventForm.controls).forEach(key => {
      let value = this.eventForm.get(key)?.value;
      
      if (key === 'max_participants' && this.eventForm.get('ignore_max_capacity')?.value) {
        value = 999999;
      }

      if (typeof value === 'boolean') {
        value = value ? '1' : '0';
      }

      if (key !== 'ignore_max_capacity' && value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const existing = this.eventModel();
    const request = existing 
      ? this.eventService.updateEvent(existing.id_event, formData)
      : this.eventService.createEvent(formData);

    request.pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.eventUpdated.emit();
          if (!existing) this.close.emit();
          else alert('Event updated successfully!');
        },
        error: (err) => {
          this.submitError.set(err.error?.message || 'Action failed.');
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
