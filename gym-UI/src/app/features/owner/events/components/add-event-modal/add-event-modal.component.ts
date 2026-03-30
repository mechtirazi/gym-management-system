import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { EventModel } from '../../../../../shared/models/event.model';
import { finalize } from 'rxjs';

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

  get isEditMode(): boolean {
    return !!this.editEvent();
  }

  addForm: FormGroup;

  constructor() {
    this.addForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      max_participants: [50, [Validators.required, Validators.min(1)]],
      is_rewarded: [false],
      reward_amount: [0, [Validators.min(0)]]
    });
  }

  ngOnInit() {
    const existing = this.editEvent();
    if (existing) {
      this.addForm.patchValue({
        title:            existing.title,
        description:      existing.description,
        start_date:       existing.start_date ? existing.start_date.toString().split('T')[0] : '',
        end_date:         existing.end_date   ? existing.end_date.toString().split('T')[0]   : '',
        max_participants: existing.max_participants,
        is_rewarded:      existing.is_rewarded,
        reward_amount:    existing.reward_amount
      });
    }
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

    this.isAdding.set(true);
    const existing = this.editEvent();

    if (existing) {
      // EDIT mode
      this.eventService.updateEvent(existing.id_event, this.addForm.value)
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
      this.eventService.createEvent(this.addForm.value)
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
