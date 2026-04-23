import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TrainerService } from '../../services/trainer.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-broadcast-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="dialog-overlay" (click)="close.emit()">
      <div class="dialog-card glass-card" (click)="$event.stopPropagation()">
        <header class="dialog-header">
          <div class="title-with-icon">
            <span class="icon">📢</span>
            <h2>Send Announcement</h2>
          </div>
          <button class="close-btn" (click)="close.emit()">×</button>
        </header>

        <p class="target-info">
          Target: <strong>{{ targetName || 'All Members' }}</strong>
        </p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="broadcast-form">
          <label class="form-field">
            <span>Title</span>
            <input type="text" formControlName="title" placeholder="e.g. Session Update">
          </label>

          <label class="form-field">
            <span>Type</span>
            <select formControlName="type">
              <option value="info">Information</option>
              <option value="warning">Important Alert</option>
              <option value="promo">Promotion / Motivation</option>
            </select>
          </label>

          <label class="form-field">
            <span>Message</span>
            <textarea formControlName="message" rows="4" placeholder="Type your message here..."></textarea>
          </label>

          <div class="dialog-actions">
            <button type="button" class="btn secondary" (click)="close.emit()">Cancel</button>
            <button type="submit" class="btn primary" [disabled]="form.invalid || isLoading()">
              {{ isLoading() ? 'Sending...' : 'Broadcast Now' }}
            </button>
          </div>
        </form>

        @if (error()) {
          <div class="error-msg">{{ error() }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .dialog-card {
      width: 90%;
      max-width: 500px;
      padding: 2rem;
      background: var(--admin-glass);
      border: 1px solid var(--admin-glass-border);
      border-radius: 32px;
      box-shadow: var(--admin-glass-shadow);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      
      .title-with-icon {
        display: flex;
        align-items: center;
        gap: 1rem;
        
        .icon { font-size: 1.5rem; }
        h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--admin-text-primary); }
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 2rem;
        color: var(--admin-text-secondary);
        cursor: pointer;
        line-height: 1;
      }
    }

    .target-info {
      font-size: 0.85rem;
      color: var(--admin-text-secondary);
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--admin-glass-border);
      
      strong { color: var(--admin-accent-indigo); }
    }

    .broadcast-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      
      span { font-size: 0.8rem; font-weight: 800; color: var(--admin-text-secondary); margin-left: 0.5rem; }
      
      input, select, textarea {
        padding: 0.9rem 1.2rem;
        border-radius: 16px;
        border: 2px solid var(--admin-glass-border);
        background: rgba(255, 255, 255, 0.05);
        color: var(--admin-text-primary);
        font-size: 0.95rem;
        font-family: inherit;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: var(--admin-accent-indigo);
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1rem;
    }

    .btn {
      padding: 0.8rem 1.5rem;
      border-radius: 14px;
      font-weight: 800;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      border: none;

      &.primary {
        background: linear-gradient(135deg, var(--admin-accent-indigo) 0%, var(--admin-accent-emerald) 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        
        &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); }
      }

      &.secondary {
        background: rgba(255, 255, 255, 0.05);
        color: var(--admin-text-primary);
        border: 1px solid var(--admin-glass-border);
        
        &:hover { background: rgba(255, 255, 255, 0.1); }
      }

      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .error-msg {
      margin-top: 1.5rem;
      padding: 1rem;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      border-radius: 14px;
      color: #f43f5e;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: center;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class BroadcastDialogComponent {
  private fb = inject(FormBuilder);
  private trainerService = inject(TrainerService);

  @Input() targetName = '';
  @Input() idCourse?: string;
  @Input() idSession?: string;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<string>();

  isLoading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    message: ['', [Validators.required]],
    type: ['info', [Validators.required]]
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.error.set(null);

    const payload = {
      ...this.form.getRawValue() as any,
      id_course: this.idCourse,
      id_session: this.idSession
    };

    this.trainerService.sendBroadcast(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.success.emit(res.message);
          this.close.emit();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to send broadcast.');
        }
      });
  }
}
