import { Component, input, output, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StaffMember } from '../../../../../shared/models/staff-member.model';
import { StaffService } from '../../services/staff.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-staff-profile-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './staff-profile-modal.component.html',
  styleUrl: './staff-profile-modal.component.scss'
})
export class StaffProfileModalComponent implements OnInit {
  member = input.required<StaffMember>();
  initialEditMode = input<boolean>(false);
  close = output<void>();
  updated = output<void>();

  private fb = inject(FormBuilder);
  private staffService = inject(StaffService);

  isEditing = signal(false);
  isSubmitting = signal(false);
  editError = signal<string | null>(null);

  editForm!: FormGroup;

  readonly staffRoles = [
    { value: 'trainer',       label: 'Trainer'       },
    { value: 'receptionist',  label: 'Receptionist'  },
    { value: 'nutritionist',  label: 'Nutritionist'  },
  ];

  constructor() {
    effect(() => {
      this.isEditing.set(this.initialEditMode());
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    const names = (this.member().name || '').trim().split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    this.editForm = this.fb.group({
      firstName: [firstName, Validators.required],
      lastName: [lastName, Validators.required],
      email: [this.member().email || '', [Validators.required, Validators.email]],
      phone: [this.member().phone || ''],
      role: [(this.member().role || 'staff').toLowerCase(), Validators.required]
    });
  }

  toggleEdit() {
    this.isEditing.update(v => !v);
    if (!this.isEditing()) {
      const names = (this.member().name || '').trim().split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      this.editForm.patchValue({
        firstName,
        lastName,
        email: this.member().email || '',
        phone: this.member().phone || '',
        role: (this.member().role || 'staff').toLowerCase()
      });
      this.editError.set(null);
    }
  }

  closeProfile() {
    this.close.emit();
  }

  submitUpdate() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formVal = this.editForm.value;
    const payload = {
      name: formVal.firstName,
      last_name: formVal.lastName,
      email: formVal.email,
      phone: formVal.phone,
      role: formVal.role
    };

    const targetId = this.member()['userId']; 

    if (!targetId) {
      this.editError.set('Cannot update: User ID is missing.');
      return;
    }

    this.isSubmitting.set(true);
    this.editError.set(null);

    this.staffService.updateStaff(targetId, payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.isEditing.set(false);
          this.updated.emit();
        },
        error: (err: any) => {
          console.error('Update staff error:', err);
          this.editError.set(err.error?.message || err.message || 'Failed to update staff member.');
        }
      });
  }
}
