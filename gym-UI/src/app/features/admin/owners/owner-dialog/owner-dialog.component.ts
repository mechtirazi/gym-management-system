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
             <mat-icon>{{data.user ? 'manage_accounts' : 'person_add'}}</mat-icon>
          </div>
          <div class="header-title-wrap">
             <h2>{{ data.user ? 'Update Identity' : 'Provision Owner' }}</h2>
             <p>{{ data.user ? 'Modify administrative node parameters' : 'Initialize a new governance entity' }}</p>
          </div>
       </div>

       <form [formGroup]="form" (ngSubmit)="onSubmit()" class="admin-form-group">
          <div *ngIf="errorMessage()" class="admin-alert mb-4" 
               style="background: rgba(244, 63, 94, 0.05); border-color: rgba(244, 63, 94, 0.1); color: var(--admin-accent-rose); min-height: auto; padding: 1rem;">
             <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 8px;">error_outline</mat-icon>
             <span style="font-size: 0.75rem; font-weight: 800;">{{ errorMessage() }}</span>
          </div>
       
          <div class="two-col-grid">
             <div class="form-field">
               <label>First Name</label>
               <input formControlName="name" type="text" placeholder="John" />
             </div>
             <div class="form-field">
               <label>Last Name</label>
               <input formControlName="last_name" type="text" placeholder="Doe" />
             </div>
          </div>

          <div class="form-field">
             <label>Network Identifier (Email)</label>
             <input formControlName="email" type="email" placeholder="owner@gym-nexus.com" />
          </div>

          <div class="form-field" *ngIf="!data.user">
             <label>Access Key (Temporary Password)</label>
             <input formControlName="password" type="password" placeholder="••••••••" />
             <p style="font-size: 0.625rem; font-weight: 800; color: #475569; margin: 4px 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Min 8 characters required</p>
          </div>

          <div class="form-field">
             <label>Relay Phone (Optional)</label>
             <input formControlName="phone" type="tel" placeholder="+1 234 567 890" />
          </div>

          <div class="admin-dialog-footer">
             <button type="button" (click)="onCancel()" class="admin-btn" [disabled]="loading()">Cancel</button>
             <button type="submit" [disabled]="form.invalid || loading()" class="admin-btn btn-primary">
                {{ loading() ? 'Processing...' : (data.user ? 'Sync Identity' : 'Provision Node') }}
             </button>
          </div>
       </form>
    </div>
  `
})
export class OwnerDialogComponent {
  private fb = inject(FormBuilder);
  private ownersService = inject(AdminOwnersService);
  private dialogRef = inject(MatDialogRef<OwnerDialogComponent>);
  
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''], // dynamically validated
    phone: ['']
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

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.form.invalid) return;

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
