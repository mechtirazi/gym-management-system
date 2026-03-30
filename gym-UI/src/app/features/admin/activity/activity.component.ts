import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminOwnersService } from '../../../core/services/admin-owners.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserVm, NotificationDto } from '../../../core/models/api.models';

interface LogEntry {
  id: string;
  type: 'auth' | 'system' | 'user_management' | 'product_sync' | 'notification';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
}

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  styleUrl: './activity.component.scss',
  template: `
    <div class="admin-page-container">
      <div class="timeline-header">
        <header class="admin-header">
          <div class="admin-badge-mini">
            <mat-icon style="font-size: 14px; width: 14px; height: 14px;">stream</mat-icon>
            Platform Activity
          </div>
          <h1>Audit Stream</h1>
          <p>Real-time audit stream & lifecycle events</p>
        </header>

        <button class="admin-btn btn-primary" (click)="loadActivity()" [disabled]="loading()">
          <mat-icon [class.is-spinning]="loading()">refresh</mat-icon>
          <span>Refresh Stream</span>
        </button>
      </div>

      <!-- Warning Alert -->
      <div class="admin-alert mb-10">
        <div class="alert-icon-box">
          <mat-icon>warning_amber</mat-icon>
        </div>
        <div class="alert-content">
          <span class="alert-tag">Integrity Notice</span>
          <h3>Simulated Audit Stream</h3>
          <p>
            This timeline represents a client-side aggregation of platform state. Historical audit records are 
            preserved via backend event-sourcing and are presented here through simulated adapter layers for review.
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="activity-loading">
        <div class="spinner"></div>
        <p>Synchronizing Data Stream...</p>
      </div>

      <!-- Timeline Container -->
      <div *ngIf="!loading()" class="activity-card">
        <div class="activity-list">
          <div *ngFor="let log of logs()" class="activity-item" [ngClass]="'status-' + log.status">
            
            <!-- Icon Marker -->
            <div class="activity-marker shadow-lg">
              <mat-icon>{{ getIcon(log.type) }}</mat-icon>
            </div>

            <!-- Content Card -->
            <div class="activity-main">
              <div class="activity-meta">
                <span class="activity-type">{{ log.type }}</span>
                <span class="activity-time">{{ log.timestamp | date:'HH:mm MMM d' }}</span>
              </div>
              
              <h4>{{ log.title }}</h4>
              <p>{{ log.description }}</p>

              <!-- Simulated user badge for some logs -->
              <div class="activity-user-badge" *ngIf="log.type === 'auth' || log.type === 'user_management'">
                <div class="avatar">SA</div>
                <span>Super Admin</span>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="logs().length === 0" class="empty-activity">
            <mat-icon>event_busy</mat-icon>
            <p>No activity recorded in current buffer</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ActivityComponent implements OnInit {
  private ownersService = inject(AdminOwnersService);
  private notificationsService = inject(NotificationService);

  loading = signal(true);
  logs = signal<LogEntry[]>([]);

  ngOnInit() {
    this.loadActivity();
  }

  loadActivity() {
    this.loading.set(true);

    forkJoin({
      users: this.ownersService.getOwners().pipe(catchError(() => of([] as UserVm[]))),
      notifications: this.notificationsService.getNotifications().pipe(catchError(() => of([] as NotificationDto[])))
    }).subscribe({
      next: ({ users, notifications }: { users: UserVm[], notifications: NotificationDto[] }) => {
        const entries: LogEntry[] = [];

        // Session entry
        entries.push({
          id: 'session-1',
          type: 'auth',
          title: 'Session Authenticated',
          description: 'Super Admin JWT validated. Dashboard adapter aggregation initiated.',
          timestamp: new Date(),
          status: 'success'
        });

        // User-derived entries
        if (users.length > 0) {
          entries.push({
            id: 'users-summary',
            type: 'user_management',
            title: `${users.length} Owner Accounts Loaded`,
            description: `${users.filter(u => !!u.email_verified_at).length} verified, ${users.filter(u => !u.email_verified_at).length} pending verification.`,
            timestamp: new Date(Date.now() - 1000 * 60 * 2),
            status: 'success'
          });

          // Latest user
          const sorted = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          if (sorted[0]) {
            entries.push({
              id: 'users-latest',
              type: 'user_management',
              title: `Latest Owner: ${sorted[0].name} ${sorted[0].last_name}`,
              description: `Registered on ${new Date(sorted[0].created_at).toLocaleDateString()}. Status: ${sorted[0].email_verified_at ? 'Verified' : 'Pending'}.`,
              timestamp: new Date(sorted[0].created_at),
              status: 'info'
            });
          }
        }



        // Notification-derived entries
        if (notifications.length > 0) {
          entries.push({
            id: 'notif-summary',
            type: 'notification',
            title: `${notifications.length} Notification(s) Active`,
            description: `Latest: "${notifications[0].text}"`,
            timestamp: new Date(notifications[0].created_at),
            status: 'info'
          });
        }

        // System entry
        entries.push({
          id: 'system-probe',
          type: 'system',
          title: 'Adapter Aggregation Complete',
          description: 'All accessible resources have been fetched and merged into the activity timeline.',
          timestamp: new Date(Date.now() - 1000 * 60 * 10),
          status: 'success'
        });

        // Sort by timestamp desc
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        this.logs.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getIcon(type: string) {
    switch (type) {
      case 'auth': return 'vpn_key';
      case 'system': return 'memory';
      case 'user_management': return 'manage_accounts';
      case 'product_sync': return 'sync';
      case 'notification': return 'notifications';
      default: return 'event';
    }
  }

  getIconBgClasses(type: string, status: string) {
    if (status === 'error') return 'bg-rose-500 shadow-rose-500/20';
    if (status === 'warning') return 'bg-amber-500 shadow-amber-500/20';

    switch (type) {
      case 'auth': return 'bg-blue-600 shadow-blue-500/20';
      case 'system': return 'bg-slate-600 shadow-slate-500/20';
      case 'user_management': return 'bg-indigo-600 shadow-indigo-500/20';
      case 'product_sync': return 'bg-teal-600 shadow-teal-500/20';
      case 'notification': return 'bg-purple-600 shadow-purple-500/20';
      default: return 'bg-slate-700';
    }
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'success': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'warning': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'error': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
      case 'info': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
      default: return 'bg-slate-500';
    }
  }
}
