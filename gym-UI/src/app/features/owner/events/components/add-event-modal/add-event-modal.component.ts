import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { EventModel } from '../../../../../shared/models/event.model';
import { finalize } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-add-event-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-event-modal.component.html',
  styleUrl: './add-event-modal.component.scss'
})
export class AddEventModalComponent implements OnInit {
  private eventService = inject(EventService);
  private fb = inject(FormBuilder);

  /** Pass an existing event to switch the modal to edit mode */
  editEvent = input<EventModel | null>(null);

  close = output<void>();
  eventAdded = output<void>();

  isAdding = signal<boolean>(false);
  addError = signal<string | null>(null);
  selectedFile: File | null = null;
  imagePreview = signal<string | null>(null);

  get isEditMode(): boolean {
    return !!this.editEvent();
  }

  addForm: FormGroup;

  constructor() {
    this.addForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      start_date: ['', Validators.required],
      start_time: [''],
      end_date: ['', Validators.required],
      end_time: [''],
      max_participants: [50, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      is_rewarded: [false],
      reward_amount: [0, [Validators.min(0)]],
      max_winners: [1, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    const existing = this.editEvent();
    if (existing) {
      this.addForm.patchValue({
        title:            existing.title,
        description:      existing.description,
        start_date:       existing.start_date ? existing.start_date.toString().split('T')[0] : '',
        start_time:       existing.start_time || '',
        end_date:         existing.end_date   ? existing.end_date.toString().split('T')[0]   : '',
        end_time:         existing.end_time || '',
        max_participants: existing.max_participants,
        price:            existing.price,
        is_rewarded:      existing.is_rewarded,
        reward_amount:    existing.reward_amount,
        max_winners:      existing.max_winners || 1
      });
      const rawImage = existing.image_url || (existing as any).image || (existing as any).picture || (existing as any).logo || (existing as any).logo_url;
      if (rawImage) {
        this.imagePreview.set(this.getImageUrl(rawImage));
      }
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
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview.set(null);
  }

  cancelAdd() {
    this.close.emit();
  }

  submitAddEvent() {
    this.addError.set(null);

    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    Object.keys(this.addForm.controls).forEach(key => {
      let value = this.addForm.get(key)?.value;
      // Convert booleans to 1/0 for Laravel's boolean validator when using FormData
      if (typeof value === 'boolean') {
        value = value ? '1' : '0';
      }
      formData.append(key, value);
    });

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.isAdding.set(true);
    const existing = this.editEvent();

    if (existing) {
      // EDIT mode
      this.eventService.updateEvent(existing.id_event, formData)
        .pipe(finalize(() => this.isAdding.set(false)))
        .subscribe({
          next: () => {
            this.eventAdded.emit();
            this.close.emit();
          },
          error: (err) => {
            this.addError.set(err.error?.message || err.message || 'Failed to update event.');
          }
        });
    } else {
      // ADD mode
      this.eventService.createEvent(formData)
        .pipe(finalize(() => this.isAdding.set(false)))
        .subscribe({
          next: () => {
            this.eventAdded.emit();
            this.close.emit();
          },
          error: (err) => {
            this.addError.set(err.error?.message || err.message || 'Failed to create event. Please try again.');
          }
        });
    }
  }
}
