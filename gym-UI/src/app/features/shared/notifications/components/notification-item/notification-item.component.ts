import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GymNotification } from '../../../../../shared/models/notification.model';
import { NotificationFeatureService } from '../../notifications.service';

@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-card" [ngClass]="[baseType, notification.unread ? 'unread' : '']">
      <div class="card-icon" [ngClass]="baseType">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <ng-container [ngSwitch]="baseType">
            <ng-container *ngSwitchCase="'info'">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </ng-container>
            <ng-container *ngSwitchCase="'success'">
              <polyline points="20 6 9 17 4 12"></polyline>
            </ng-container>
            <ng-container *ngSwitchCase="'warning'">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </ng-container>
            <ng-container *ngSwitchCase="'error'">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </ng-container>
            <ng-container *ngSwitchDefault>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </ng-container>
          </ng-container>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-header">
          <div class="card-title-section">
            <h3 class="card-title">{{ notification.title }}</h3>
            <span class="card-sender" *ngIf="notification.sender">
              {{ notification.sender.name }} {{ notification.sender.last_name }}
            </span>
          </div>
          <span class="card-time">{{ notification.time }}</span>
        </div>
        <p class="card-desc">{{ notification.description }}</p>
        <div class="card-actions">
          @if (isInvitation()) {
            @if (!isGlobalProcessing()) {
              <button class="action-btn accept" (click)="handleAccept()">Accept</button>
              <button class="action-btn decline" (click)="handleDecline()">Decline</button>
            } @else {
              <div class="processing-spinner">
                <div class="spinner-dot"></div>
                <span>Processing...</span>
              </div>
            }
          } @else if (notification.unread && !isGlobalProcessing()) {
            <button class="action-btn secondary" (click)="onMarkRead.emit(notification.id)">
              Mark as read
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .processing-spinner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--admin-accent-indigo);
      padding: 0.5rem;
    }

    .spinner-dot {
      width: 12px;
      height: 12px;
      border: 2px solid var(--admin-accent-indigo);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .notification-card {
      display: flex;
      gap: 1.5rem;
      padding: 1.5rem;
      background: var(--admin-glass);
      border-radius: 24px;
      border: 1px solid var(--admin-glass-border);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;

      &.unread {
        border-color: var(--admin-accent-indigo);
        &::after {
          content: '';
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 8px;
          height: 8px;
          background: var(--admin-accent-indigo);
          border-radius: 50%;
          box-shadow: 0 0 12px var(--admin-accent-indigo);
        }
      }

      &.info { background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), transparent); border-color: rgba(99, 102, 241, 0.2); }
      &.success { background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), transparent); border-color: rgba(16, 185, 129, 0.2); }
      &.warning { background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), transparent); border-color: rgba(245, 158, 11, 0.2); }
      &.error { background: linear-gradient(135deg, rgba(244, 63, 94, 0.08), transparent); border-color: rgba(244, 63, 94, 0.2); }
      &.invitation { background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), transparent); border-color: rgba(245, 158, 11, 0.2); }

      &:hover {
        transform: translateX(5px);
        background: var(--admin-item-bg);
      }
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--admin-item-bg);
      border: 1px solid var(--admin-item-border);
      color: var(--admin-text-primary);

      &.info { color: var(--admin-accent-indigo); background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.3); }
      &.success { color: var(--admin-accent-emerald); background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); }
      &.warning { color: #f59e0b; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); }
      &.error { color: var(--admin-accent-rose); background: rgba(244, 63, 94, 0.15); border-color: rgba(244, 63, 94, 0.3); }
      &.invitation { color: #f59e0b; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); }
      svg { width: 22px; height: 22px; }
    }

    .card-content { flex: 1; min-width: 0; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
    .card-title-section { display: flex; flex-direction: column; gap: 0.25rem; }
    .card-title { font-size: 1.1rem; font-weight: 800; color: var(--admin-text-primary); margin: 0; }
    .card-sender { font-size: 0.85rem; font-weight: 600; color: var(--admin-accent-indigo); margin: 0; }
    .card-time { font-size: 0.8rem; font-weight: 600; color: var(--admin-text-secondary); opacity: 0.6; }
    .card-desc { font-size: 0.95rem; color: var(--admin-text-secondary); line-height: 1.6; margin: 0; }
    .card-actions { margin-top: 1rem; display: flex; justify-content: flex-end; }

    .action-btn {
      padding: 0.5rem 1rem;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.3s;
      border: none;
      
      &.secondary {
        background: var(--admin-item-bg);
        border: 1px solid var(--admin-item-border);
        color: var(--admin-text-primary);
        &:hover {
          background: var(--admin-accent-indigo);
          color: white;
          border-color: var(--admin-accent-indigo);
          transform: translateY(-2px);
        }
      }

      &.accept {
        background: var(--admin-accent-emerald);
        color: white;
        margin-right: 0.5rem;
        &:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3);
        }
      }

      &.decline {
        background: rgba(244, 63, 94, 0.1);
        color: var(--admin-accent-rose);
        &:hover { background: rgba(244, 63, 94, 0.2); }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationItemComponent {
  private featureService = inject(NotificationFeatureService, { optional: true });
  
  @Input({ required: true }) notification!: GymNotification;
  
  @Output() onMarkRead = new EventEmitter<string>();
  @Output() onAccept = new EventEmitter<GymNotification>();
  @Output() onDecline = new EventEmitter<GymNotification>();

  processing = signal(false);

  isInvitation = computed(() => {
    return this.notification.type?.includes('invitation') && this.notification.unread;
  });

  get baseType(): string {
    const type = this.notification.type || '';
    if (type.includes('invitation')) return 'invitation';
    if (type.includes('info')) return 'info';
    if (type.includes('success')) return 'success';
    if (type.includes('warning')) return 'warning';
    if (type.includes('error')) return 'error';
    return 'default';
  }

  isGlobalProcessing = computed(() => {
    return this.featureService?.isProcessing(this.notification.id) || this.processing();
  });

  handleAccept() {
    this.processing.set(true);
    this.onAccept.emit(this.notification);
  }

  handleDecline() {
    this.processing.set(true);
    this.onDecline.emit(this.notification);
  }
}
