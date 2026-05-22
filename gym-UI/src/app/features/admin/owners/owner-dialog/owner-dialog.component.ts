import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AdminOwnersService } from '../../../../core/services/admin-owners.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OwnerCreatePayload, OwnerUpdatePayload, UserVm } from '../../../../core/models/api.models';

@Component({
  selector: 'app-owner-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, 
    MatInputModule, MatIconModule, MatDatepickerModule, MatNativeDateModule
  ],
  styleUrl: './owner-dialog.component.scss',
  template: `
    <div class="admin-dialog-container">
       <div class="admin-dialog-header">
          <div class="header-icon">
             <mat-icon>{{data.user ? 'shield_person' : 'person_add_alt'}}</mat-icon>
          </div>
          <div class="header-title-wrap">
              <h2>{{ data.user ? 'Edit Owner Profile' : 'Register New Owner' }}</h2>
              <p>{{ data.user ? 'Modify administrative account parameters' : 'Onboard a new gym facility provider' }}</p>
           </div>
           <button class="close-header-btn" (click)="onCancel()"><mat-icon>close</mat-icon></button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="admin-form-group compact-form">
           <!-- Premium Alert System -->
           <div *ngIf="errorMessage()" class="admin-alert status-error mb-4">
              <div class="alert-icon-box">
                 <mat-icon>terminal</mat-icon>
              </div>
              <div class="alert-content">
                 <span class="alert-tag">Security Exception</span>
                 <p class="error-text">{{ errorMessage() }}</p>
              </div>
           </div>
        
           <div class="two-col-grid mb-4">
              <div class="form-field" [class.has-error]="form.get('name')?.invalid && form.get('name')?.touched">
                 <label><mat-icon>badge</mat-icon> First Name</label>
                 <div class="input-glow-wrap">
                    <input formControlName="name" type="text" placeholder="John" />
                 </div>
              </div>
              <div class="form-field" [class.has-error]="form.get('last_name')?.invalid && form.get('last_name')?.touched">
                 <label><mat-icon>fingerprint</mat-icon> Last Name</label>
                 <div class="input-glow-wrap">
                    <input formControlName="last_name" type="text" placeholder="Doe" />
                 </div>
              </div>
           </div>

           <div class="two-col-grid mb-4">
              <div class="form-field" [class.has-error]="form.get('email')?.invalid && form.get('email')?.touched">
                 <label><mat-icon>alternate_email</mat-icon> Email Address</label>
                 <div class="input-glow-wrap">
                    <input formControlName="email" type="email" placeholder="owner@gym-nexus.com" />
                 </div>
                 <p class="field-error" *ngIf="form.get('email')?.invalid && form.get('email')?.touched">Valid email required</p>
              </div>
              
              <div class="form-field" [class.has-error]="form.get('phone')?.invalid && form.get('phone')?.touched">
                 <label><mat-icon>contact_phone</mat-icon> Contact Phone</label>
                 <div class="input-glow-wrap phone-input-wrap">
                    <div class="country-prefix">
                       <img src="https://flagcdn.com/w20/tn.png" alt="TN" class="flag-icon">
                       <span class="country-code-label">TUN</span>
                    </div>
                    <input formControlName="phone" type="tel" placeholder="22 123 456" maxlength="8" (keypress)="onlyNumbers($event)" />
                 </div>
                 <p class="field-error" *ngIf="form.get('phone')?.invalid && form.get('phone')?.touched">Exactly 8 digits required</p>
              </div>
           </div>

           <div class="form-field mb-6" *ngIf="!data.user">
              <label><mat-icon>key</mat-icon> Security Password</label>
              <div class="input-glow-wrap">
                 <input formControlName="password" type="password" placeholder="••••••••" />
              </div>
              <p class="field-hint">Min 8 characters required for platform integrity</p>
           </div>

           <div class="admin-dialog-footer">
              <button type="button" (click)="onCancel()" class="admin-btn" [disabled]="loading()">
                 <mat-icon>close</mat-icon> Dismiss
              </button>
              <button type="submit" [disabled]="form.invalid || loading()" class="admin-btn btn-primary">
                 <mat-icon>{{ loading() ? 'sync' : (data.user ? 'published_with_changes' : 'person_add') }}</mat-icon>
                 {{ loading() ? 'Processing...' : (data.user ? 'Update Parameters' : 'Finalize Registration') }}
              </button>
           </div>
        </form>
    </div>
  `
})
export class OwnerDialogComponent {
  private fb = inject(FormBuilder);
  private ownersService = inject(AdminOwnersService);
  private toastService = inject(ToastService);
  private dialogRef = inject(MatDialogRef<OwnerDialogComponent>);
  
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''], // dynamically validated
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { user?: UserVm }
  ) {
    if (this.data.user) {
       this.form.patchValue({
         name: this.data.user.name,
         last_name: this.data.user.last_name,
         email: this.data.user.email,
         phone: this.data.user.phone || ''
       });
       this.form.get('password')?.disable();
    } else {
       this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    }
  }
  
  onlyNumbers(event: KeyboardEvent) {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const isUpdate = !!this.data.user;
    const payload = this.form.value;
    const obs = isUpdate
      ? this.ownersService.updateOwner(this.data.user!.id_user, payload as OwnerUpdatePayload)
      : this.ownersService.createOwner(payload as OwnerCreatePayload);

    obs.subscribe({
      next: (res) => {
        this.loading.set(false);
        this.dialogRef.close(true); // Return success
        this.toastService.success(isUpdate ? 'Owner account updated' : 'New owner registered successfully');
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 422) {
           this.errorMessage.set(Object.values(err.error?.errors || {}).flat().join('\n') || 'Validation failed');
        } else {
           this.errorMessage.set(err.error?.message || 'Unexpected error occurred.');
        }
      }
    });
  }
}
