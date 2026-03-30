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
           <h2>Sever Access</h2>
           <p>This will immediately block all users of <strong>{{ data.gymName }}</strong> from the platform ecosystem.</p>
        </div>
      </div>

      <div class="admin-form-group">
        <div class="form-field">
          <label for="reason">Termination Rationale</label>
          <textarea
            id="reason"
            [(ngModel)]="reason"
            placeholder="e.g. Policy violation, node inconsistency, etc."
          ></textarea>
          <p style="font-size: 0.625rem; font-weight: 800; color: #475569; margin: 4px 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Rationale is logged in the system audit</p>
        </div>
      </div>

      <div class="admin-dialog-footer">
        <button type="button" class="admin-btn" (click)="dialogRef.close()">Cancel</button>
        <button
          type="button"
          class="admin-btn btn-primary"
          style="background: var(--admin-accent-rose); border-color: rgba(244, 63, 94, 0.2);"
          [disabled]="!reason.trim()"
          (click)="dialogRef.close(reason)"
        >
          <mat-icon style="font-size: 16px; width: 16px; height: 16px;">block</mat-icon>
          SEVER ACCESS
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SuspendDialogComponent {
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<SuspendDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { gymName: string }
  ) {}
}
