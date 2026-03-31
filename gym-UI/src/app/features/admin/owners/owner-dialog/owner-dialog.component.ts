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
             <mat-icon>{{data.user ? 'shield_person' : 'person_add_alt'}}</mat-icon>
          </div>
          <div class="header-title-wrap">
             <h2>{{ data.user ? 'Identity Management' : 'Owner Provisioning' }}</h2>
             <p>{{ data.user ? 'Modify administrative node parameters for governance' : 'Initialize a new top-level governance entity' }}</p>
          </div>
       </div>

       <form [formGroup]="form" (ngSubmit)="onSubmit()" class="admin-form-group">
          <!-- Premium Alert System -->
          <div *ngIf="errorMessage()" class="admin-alert status-error mb-6">
             <div class="alert-icon-box" style="background: rgba(244, 63, 94, 0.1); border-color: rgba(244, 63, 94, 0.2); color: var(--admin-accent-rose);">
                <mat-icon>terminal</mat-icon>
             </div>
             <div class="alert-content">
                <span class="alert-tag" style="color: var(--admin-accent-rose);">Protocol Error</span>
                <h3>Validation Exception</h3>
                <p style="white-space: pre-line; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">{{ errorMessage() }}</p>
             </div>
          </div>
       
          <div class="two-col-grid">
             <div class="form-field">
                <label><mat-icon>badge</mat-icon> First Name</label>
                <div class="input-glow-wrap">
                   <input formControlName="name" type="text" placeholder="John" />
                </div>
             </div>
             <div class="form-field">
                <label><mat-icon>fingerprint</mat-icon> Last Name</label>
                <div class="input-glow-wrap">
                   <input formControlName="last_name" type="text" placeholder="Doe" />
                </div>
             </div>
          </div>

          <div class="form-field">
             <label><mat-icon>alternate_email</mat-icon> Network Identifier (Email)</label>
             <div class="input-glow-wrap">
                <input formControlName="email" type="email" placeholder="owner@gym-nexus.com" />
             </div>
          </div>

          <div class="form-field" *ngIf="!data.user">
             <label><mat-icon>key</mat-icon> Access Key (Temporary Password)</label>
             <div class="input-glow-wrap">
                <input formControlName="password" type="password" placeholder="••••••••" />
             </div>
             <p class="field-hint">Quantum-secure: Min 8 characters required</p>
          </div>

          <div class="form-field">
             <label><mat-icon>contact_phone</mat-icon> Relay Phone (Optional)</label>
             <div class="input-glow-wrap">
                <input formControlName="phone" type="tel" placeholder="+1 234 567 890" />
             </div>
          </div>

          <div class="admin-dialog-footer">
             <button type="button" (click)="onCancel()" class="admin-btn" [disabled]="loading()">
                <mat-icon>close</mat-icon> Abort
             </button>
             <button type="submit" [disabled]="form.invalid || loading()" class="admin-btn btn-primary">
                <mat-icon>{{ loading() ? 'sync' : (data.user ? 'published_with_changes' : 'vitals') }}</mat-icon>
                {{ loading() ? 'Executing...' : (data.user ? 'Sync Identity' : 'Provision Node') }}
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
