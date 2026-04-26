import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StaffService } from '../../services/staff.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-hire-staff-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './hire-staff-modal.component.html',
  styleUrl: './hire-staff-modal.component.scss'
})
export class HireStaffModalComponent {
  private staffService = inject(StaffService);
  private fb = inject(FormBuilder);

  close = output<void>();
  staffHired = output<void>();

  showPassword = signal<boolean>(false);
  isAdding     = signal<boolean>(false);
  addError     = signal<string | null>(null);
  isExistingUserMode = signal<boolean>(false);

  addForm: FormGroup;

  readonly staffRoles = [
    { value: 'trainer',       label: 'Trainer'       },
    { value: 'receptionist',  label: 'Receptionist'  },
    { value: 'nutritionist',  label: 'Nutritionist'  },
  ];

  constructor() {
    this.addForm = this.fb.group({
      name:      ['', Validators.required],
      last_name: ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      phone:     [''],
      role:      ['trainer', Validators.required],
      password:  ['TempPass123!', [Validators.required, Validators.minLength(8)]]
    });
  }

  private snackBar = inject(MatSnackBar);

  cancelAdd() {
    this.close.emit();
  }

  toggleMode() {
    this.isExistingUserMode.set(!this.isExistingUserMode());
    this.addError.set(null); // Clear errors when toggling modes
    
    const nameCtrl = this.addForm.get('name');
    const lastNameCtrl = this.addForm.get('last_name');
    const passwordCtrl = this.addForm.get('password');

    if (this.isExistingUserMode()) {
      nameCtrl?.clearValidators();
      lastNameCtrl?.clearValidators();
      passwordCtrl?.clearValidators();
    } else {
      nameCtrl?.setValidators([Validators.required]);
      lastNameCtrl?.setValidators([Validators.required]);
      passwordCtrl?.setValidators([Validators.required, Validators.minLength(8)]);
    }
    
    nameCtrl?.updateValueAndValidity();
    lastNameCtrl?.updateValueAndValidity();
    passwordCtrl?.updateValueAndValidity();
  }

  submitAddStaff() {
    this.addError.set(null);

    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const form = this.addForm.value;
    const payload = {
      name:      form.name?.trim(),
      last_name: form.last_name?.trim(),
      email:     form.email.trim(),
      phone:     form.phone?.trim() || '',
      role:      form.role,
      password:  form.password || 'TempPass123!'
    };

    this.isAdding.set(true);
    this.staffService.addStaff(payload, this.isExistingUserMode()).subscribe({
      next: (res: any) => {
        this.isAdding.set(false);
        
        if (res && res.invitation) {
          this.snackBar.open(
            'This user already exists! An invitation has been sent to their notification center.', 
            'Understood', 
            { 
              duration: 5000, 
              horizontalPosition: 'end', 
              verticalPosition: 'bottom',
              panelClass: ['premium-toast', 'toast-info']
            }
          );
        } else {
          this.snackBar.open('New staff member hired successfully!', 'Close', { 
            duration: 3000, 
            horizontalPosition: 'end', 
            verticalPosition: 'bottom',
            panelClass: ['premium-toast', 'toast-success']
          });
        }

        this.staffHired.emit();
        this.close.emit();
      },
      error: (err: any) => {
        this.isAdding.set(false);
        console.error('Add staff error:', err);

        if (err.error?.errors) {
          const msgs = Object.values(err.error.errors).flat() as string[];
          this.addError.set(msgs.join('\n'));
        } else if (err.error?.message) {
          this.addError.set(err.error.message);
        } else if (err.message) {
          this.addError.set(err.message);
        } else {
          this.addError.set('Failed to hire staff member. Please try again.');
        }
      }
    });
  }
}
