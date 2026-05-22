import { Component, Inject, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-support-response-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="admin-dialog-container support-response-dialog">
      <header class="admin-dialog-header">
        <div class="header-icon">
          <mat-icon>reply</mat-icon>
        </div>
        <div class="header-title-wrap">
          <h2>Support Response</h2>
          <p>Sending message to {{ data.senderName }}</p>
        </div>
      </header>

      <div class="admin-dialog-body">
        <div class="original-claim-preview">
          <div class="label">Original Claim</div>
          <p>{{ data.description }}</p>
        </div>

        <form [formGroup]="responseForm" class="admin-form-group mt-6">
          <div class="form-field">
            <label>
              <mat-icon>message</mat-icon>
              Resolution Message
            </label>
            <div class="input-glow-wrap">
              <textarea 
                formControlName="message" 
                placeholder="Type your official response or resolution instructions..."
              ></textarea>
            </div>
            <div class="error-text" *ngIf="responseForm.get('message')?.touched && responseForm.get('message')?.errors?.['required']">
              Response content is required
            </div>
          </div>
        </form>
      </div>

      <footer class="admin-dialog-footer">
        <button class="admin-btn" (click)="close()">Cancel</button>
        <button 
          class="admin-btn btn-primary" 
          [disabled]="responseForm.invalid || sending()"
          (click)="sendResponse()"
        >
          <mat-icon *ngIf="!sending()">send</mat-icon>
          <span class="admin-spinner mini" *ngIf="sending()"></span>
          <span>{{ sending() ? 'Transmitting...' : 'Dispatch Response' }}</span>
        </button>
      </footer>
    </div>
  `,
  styles: [`
    @import '../admin-shared.scss';
    
    .support-response-dialog {
      max-width: 800px;
      
      .original-claim-preview {
        background: rgba(129, 140, 248, 0.04);
        border: 1px solid rgba(129, 140, 248, 0.15);
        border-radius: 1.5rem;
        padding: 1rem 1.75rem;
        margin-bottom: 1.5rem;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--admin-accent-indigo);
          opacity: 0.4;
        }

        .label {
          font-size: 0.625rem;
          font-weight: 900;
          color: var(--admin-accent-indigo);
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          opacity: 0.8;
        }

        p {
          margin: 0;
          font-size: 1.05rem;
          color: #1e293b; // Deep navy for clear reading in light mode
          line-height: 1.7;
          font-weight: 500;
          position: relative;
          z-index: 1;

          .dark & {
            color: #f8fafc; // Off-white for dark mode
          }
        }
      }

      textarea {
        min-height: 150px !important;
      }
    }

    .admin-spinner.mini {
      width: 16px;
      height: 16px;
      border-width: 2px;
    }
  `]
})
export class SupportResponseDialogComponent {
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private dialogRef = inject(MatDialogRef<SupportResponseDialogComponent>);

  sending = signal(false);

  responseForm = this.fb.group({
    message: ['', [Validators.required, Validators.minLength(5)]]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { ticketId: string, userId: string, senderName: string, description: string }
  ) { }

  close() {
    this.dialogRef.close();
  }

  sendResponse() {
    if (this.responseForm.invalid) return;

    this.sending.set(true);
    const message = this.responseForm.value.message!;

    this.notificationService.sendToUser(this.data.userId, message, 'info').subscribe({
      next: () => {
        this.notificationService.markAsRead(this.data.ticketId);
        this.dialogRef.close(true);
        this.toastService.success('Resolution message dispatched successfully');
      },
      error: () => {
        this.sending.set(false);
      }
    });
  }
}
