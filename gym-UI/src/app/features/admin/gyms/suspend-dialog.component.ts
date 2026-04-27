import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-suspend-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  template: `
    <div class="admin-dialog-container">
      <div class="admin-dialog-header">
        <div class="header-icon" style="color: var(--admin-accent-rose); background: rgba(244, 63, 94, 0.1); border-color: rgba(244, 63, 94, 0.2);">
          <mat-icon>warning</mat-icon>
        </div>
        <div class="header-title-wrap">
           <h2>Suspend Gym</h2>
           <p>This will immediately block all members and staff of <strong>{{ data.gymName }}</strong> from accessing the platform.</p>
        </div>
      </div>

      <div class="admin-form-group">
        <div class="form-field">
          <label for="reason">Reason for Suspension</label>
          <textarea
            id="reason"
            [(ngModel)]="reason"
            placeholder="e.g. Policy violation, payment issues, etc."
          ></textarea>
          <p style="font-size: 0.625rem; font-weight: 800; color: #475569; margin: 4px 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">This reason will be visible to the gym owner</p>
        </div>
      </div>

      <div class="admin-dialog-footer">
        <button type="button" class="admin-btn" (click)="dialogRef.close()">
           <mat-icon>close</mat-icon> Cancel
        </button>
        <button
          type="button"
          class="admin-btn btn-danger"
          [disabled]="!reason.trim()"
          (click)="dialogRef.close(reason)"
        >
          <mat-icon>block</mat-icon> Suspend Gym
        </button>
      </div>
    </div>
  `,
  styleUrl: './suspend-dialog.component.scss'
})
export class SuspendDialogComponent {
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<SuspendDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { gymName: string }
  ) { }
}
