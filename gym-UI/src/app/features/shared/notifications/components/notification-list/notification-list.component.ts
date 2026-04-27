import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GymNotification } from '../../../../../shared/models/notification.model';
import { NotificationItemComponent } from '../notification-item/notification-item.component';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, NotificationItemComponent],
  template: `
    <div class="notifications-scroll">
      <div class="notifications-list" *ngIf="notifications.length > 0; else emptyState">
        @for (notif of notifications; track notif.id || $index) {
          <app-notification-item
            [notification]="notif"
            (onMarkRead)="onMarkRead.emit($event)"
            (onAccept)="onAccept.emit($event)"
            (onDecline)="onDecline.emit($event)"
          ></app-notification-item>
        }
      </div>

      <div class="load-more-wrap" *ngIf="hasMore">
        <button class="load-more-btn" (click)="onLoadMore.emit()">
          Show More ({{ remainingCount }} left)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        </button>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h2>No notifications yet</h2>
          <p>We'll notify you when something important happens.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .notifications-list { display: flex; flex-direction: column; gap: 1rem; }
    .load-more-wrap { display: flex; justify-content: center; margin-top: 2rem; padding-bottom: 2rem; }
    .load-more-btn {
      background: var(--admin-glass); border: 1px solid var(--admin-glass-border);
      padding: 0.8rem 2rem; border-radius: 16px; color: var(--admin-text-primary);
      font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.3s;
      display: flex; align-items: center; gap: 0.75rem;
      svg { width: 18px; height: 18px; transition: transform 0.3s; }
      &:hover { background: var(--admin-item-bg); border-color: var(--admin-accent-indigo); transform: translateY(-2px); svg { transform: translateY(2px); } }
    }
    .empty-state {
      text-align: center; padding: 5rem 2rem; background: var(--admin-glass);
      border-radius: 32px; border: 1px dashed var(--admin-glass-border);
      .empty-icon {
        width: 80px; height: 80px; background: var(--admin-item-bg); border-radius: 50%;
        display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;
        color: var(--admin-text-secondary); opacity: 0.3;
        svg { width: 40px; height: 40px; }
      }
      h2 { font-size: 1.5rem; font-weight: 900; color: var(--admin-text-primary); margin-bottom: 0.5rem; }
      p { font-size: 1rem; color: var(--admin-text-secondary); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationListComponent {
  @Input() notifications: GymNotification[] = [];
  @Input() hasMore = false;
  @Input() remainingCount = 0;

  @Output() onMarkRead = new EventEmitter<string>();
  @Output() onAccept = new EventEmitter<GymNotification>();
  @Output() onDecline = new EventEmitter<GymNotification>();
  @Output() onLoadMore = new EventEmitter<void>();
}
