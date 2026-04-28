import { Component, Inject, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../core/services/notification.service';

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
      max-width: 600px;
      
      .original-claim-preview {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 1.25rem;
        padding: 1.5rem;
        margin-bottom: 2rem;

        .label {
          font-size: 0.65rem;
          font-weight: 950;
          color: var(--admin-accent-indigo);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 0.75rem;
        }

        p {
          margin: 0;
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.6;
          font-style: italic;
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
  private dialogRef = inject(MatDialogRef<SupportResponseDialogComponent>);
  
  sending = signal(false);
  
  responseForm = this.fb.group({
    message: ['', [Validators.required, Validators.minLength(5)]]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { ticketId: string, userId: string, senderName: string, description: string }
  ) {}

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
      },
      error: () => {
        this.sending.set(false);
      }
    });
  }
}
