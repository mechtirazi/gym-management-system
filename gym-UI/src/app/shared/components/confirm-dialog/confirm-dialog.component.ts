import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="admin-dialog-container confirm-dialog">
      <div class="admin-dialog-header">
        <div class="header-icon" [ngClass]="data.isDestructive ? 'destructive' : 'primary'">
          <mat-icon>{{ data.icon || (data.isDestructive ? 'warning' : 'info') }}</mat-icon>
        </div>
        <div class="header-title-wrap">
          <h2>{{ data.title }}</h2>
        </div>
      </div>
      
      <div class="admin-dialog-content">
        <p [innerHTML]="data.message"></p>
      </div>

      <div class="admin-dialog-footer">
        <button type="button" class="admin-btn" (click)="onCancel()">
          <mat-icon>close</mat-icon> {{ data.cancelText || 'Cancel' }}
        </button>
        <button type="button" class="admin-btn" [ngClass]="data.isDestructive ? 'btn-danger' : 'btn-primary'" (click)="onConfirm()">
          <mat-icon>{{ data.isDestructive ? 'delete_forever' : 'check' }}</mat-icon> {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
