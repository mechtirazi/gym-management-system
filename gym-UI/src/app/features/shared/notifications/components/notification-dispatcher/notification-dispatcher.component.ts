import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RecipientTarget } from '../../notifications.model';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-notification-dispatcher',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
  template: `
    <div class="dispatch-card">
      <div class="card-glow"></div>
      <div class="section-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 2L11 13"></path>
          <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
        </svg>
        <h2>Command Center</h2>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit.emit()" class="dispatch-form">
        <div class="form-field">
          <label>Recipients</label>
          <div class="radio-group">
            <label class="radio-btn">
              <input type="radio" formControlName="recipientType" value="all">
              <span class="btn-content">All {{ roleLabels.all }}</span>
            </label>
            <label class="radio-btn" *ngIf="showStaffOption">
              <input type="radio" formControlName="recipientType" value="staff">
              <span class="btn-content">Staff</span>
            </label>
            <label class="radio-btn" *ngIf="showMembersOption">
              <input type="radio" formControlName="recipientType" value="members">
              <span class="btn-content">Members</span>
            </label>
            <label class="radio-btn">
              <input type="radio" formControlName="recipientType" value="single">
              <span class="btn-content">{{ roleLabels.single }}</span>
            </label>
          </div>
        </div>
        
        <div class="form-field">
          <label>Notification Type</label>
          <div class="type-selector">
            @for (type of notificationTypes; track type.value) {
              <label class="type-btn" [ngClass]="type.value">
                <input type="radio" formControlName="type" [value]="type.value">
                <div class="type-content" [title]="type.label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" [innerHTML]="type.icon"></svg>
                  <span>{{ type.label }}</span>
                </div>
              </label>
            }
          </div>
        </div>

        <div class="form-field owner-select" *ngIf="form.get('recipientType')?.value === 'single'" [@slideIn]>
          <label>Select {{ roleLabels.single }}</label>
          <select formControlName="targetId">
            <option value="" disabled>Select recipient...</option>
            <option *ngFor="let t of targets" [value]="t.id_user">
              {{ t.name }} {{ t.last_name }} ({{ t.role || 'Member' }})
            </option>
          </select>
        </div>

        <div class="form-field">
          <label>Message Content</label>
          <textarea
            formControlName="message"
            placeholder="Type your notification message..."
          ></textarea>
          <div class="char-count">
            {{ form.get('message')?.value?.length || 0 }} chars
          </div>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            [disabled]="form.invalid || isDispatching"
            class="dispatch-btn"
          >
            <span *ngIf="!isDispatching">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; margin-right: 8px;">
                <path d="M22 2L11 13"></path>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
              Dispatch
            </span>
            <span *ngIf="isDispatching" class="loader-state">
              <svg class="spinner" viewBox="0 0 50 50">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
              </svg>
            </span>
          </button>
          <button type="button" (click)="onReset.emit()" class="reset-btn">Reset</button>
        </div>
      </form>

      <div class="tips-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <p>{{ tipText }}</p>
      </div>
    </div>
  `,
  styles: [`
    .dispatch-card {
      background: var(--admin-glass);
      backdrop-filter: blur(20px);
      border-radius: 32px;
      padding: 2.5rem;
      border: 1px solid var(--admin-glass-border);
      box-shadow: var(--admin-glass-shadow);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--admin-accent-indigo), var(--admin-accent-emerald));
      }
    }

    .section-badge {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      h2 { font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: var(--admin-text-primary); margin: 0; }
      svg { width: 24px; height: 24px; color: var(--admin-accent-indigo); }
    }

    .dispatch-form { display: flex; flex-direction: column; gap: 1.5rem; }

    .form-field {
      display: flex; flex-direction: column; gap: 0.75rem;
      label { font-size: 0.75rem; font-weight: 800; color: var(--admin-text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }
      select, textarea {
        padding: 1rem; border-radius: 16px; border: 1px solid var(--admin-item-border);
        background: var(--admin-item-bg); color: var(--admin-text-primary); font-size: 0.95rem;
        outline: none; transition: all 0.3s;
        &:focus { border-color: var(--admin-accent-indigo); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
      }
      textarea { height: 140px; resize: none; }
    }

    .radio-group {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      background: var(--admin-item-bg); padding: 4px; border-radius: 14px; border: 1px solid var(--admin-item-border);
    }

    .radio-btn {
      cursor: pointer;
      input { display: none; }
      .btn-content {
        display: flex; justify-content: center; padding: 0.6rem; border-radius: 10px;
        font-size: 0.85rem; font-weight: 700; color: var(--admin-text-secondary); transition: all 0.3s;
      }
      input:checked + .btn-content { background: var(--admin-accent-indigo); color: white; }
    }

    .type-selector { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .type-btn {
      cursor: pointer; input { display: none; }
      .type-content {
        display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
        padding: 0.75rem 0.5rem; border-radius: 16px; border: 1px solid var(--admin-item-border);
        background: var(--admin-item-bg); color: var(--admin-text-secondary); transition: all 0.3s;
        svg { width: 1.25rem; height: 1.25rem; }
        span { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
      }
      &.info input:checked + .type-content { background: rgba(99, 102, 241, 0.1); border-color: var(--admin-accent-indigo); color: var(--admin-accent-indigo); }
      &.success input:checked + .type-content { background: rgba(16, 185, 129, 0.1); border-color: var(--admin-accent-emerald); color: var(--admin-accent-emerald); }
      &.warning input:checked + .type-content { background: rgba(245, 158, 11, 0.1); border-color: #f59e0b; color: #d97706; }
      &.error input:checked + .type-content { background: rgba(244, 63, 94, 0.1); border-color: var(--admin-accent-rose); color: var(--admin-accent-rose); }
    }

    .dispatch-btn {
      background: var(--admin-accent-indigo); color: white; border: none; padding: 1rem;
      border-radius: 16px; font-size: 1rem; font-weight: 800; cursor: pointer; transition: all 0.4s;
      display: flex; align-items: center; justify-content: center;
      &:hover:not(:disabled) { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 12px 24px rgba(99, 102, 241, 0.3); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .reset-btn { background: transparent; border: none; font-size: 0.85rem; font-weight: 700; color: var(--admin-text-secondary); cursor: pointer; }

    .tips-box {
      margin-top: 2rem; background: var(--admin-glass); padding: 1.5rem; border-radius: 24px;
      display: flex; gap: 1rem; align-items: center;
      svg { width: 20px; height: 20px; color: var(--admin-accent-indigo); }
      p { font-size: 0.85rem; color: var(--admin-text-secondary); margin: 0; line-height: 1.5; }
    }

    .spinner { animation: rotate 2s linear infinite; width: 20px; height: 20px; }
    .path { stroke: white; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; }
    @keyframes rotate { 100% { transform: rotate(360deg); } }
    @keyframes dash { 0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; } 50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; } 100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationDispatcherComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() targets: RecipientTarget[] = [];
  @Input() isDispatching = false;
  @Input() showStaffOption = false;
  @Input() showMembersOption = false;
  @Input() roleLabels = { all: 'Targets', single: 'Single' };
  @Input() tipText = '';

  @Output() onSubmit = new EventEmitter<void>();
  @Output() onReset = new EventEmitter<void>();

  notificationTypes = [
    { value: 'info', label: 'Info', icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>' },
    { value: 'success', label: 'Success', icon: '<polyline points="20 6 9 17 4 12"></polyline>' },
    { value: 'warning', label: 'Warning', icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>' },
    { value: 'error', label: 'Alert', icon: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' }
  ];
}
