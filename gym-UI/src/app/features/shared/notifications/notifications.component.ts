import { Component, inject, signal, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { NotificationFeatureService } from './notifications.service';
import { NotificationLogFilter, StaffInvitation } from './notifications.model';
import { GymNotification } from '../../../shared/models/notification.model';

import { StaffInvitationsComponent } from './components/staff-invitations/staff-invitations.component';
import { NotificationFiltersComponent } from './components/notification-filters/notification-filters.component';
import { NotificationListComponent } from './components/notification-list/notification-list.component';
import { NotificationDispatcherComponent } from './components/notification-dispatcher/notification-dispatcher.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatSnackBarModule,
    StaffInvitationsComponent,
    NotificationFiltersComponent,
    NotificationListComponent,
    NotificationDispatcherComponent
  ],
  providers: [NotificationFeatureService],
  template: `
    <div class="notifications-page">
      <header class="page-header">
        <div class="header-content">
          <h1>Notifications Hub</h1>
          <p class="subtitle">{{ headerSubtitle() }}</p>
        </div>
      </header>

      <div class="main-grid">
        <!-- Activity Log (LEFT) -->
        <div class="activity-column">
          <app-staff-invitations
            [invitations]="invitations()"
            (onAccept)="handleAcceptInvite($event)"
            (onReject)="handleRejectInvite($event)"
          ></app-staff-invitations>

          <div class="section-badge log-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <h2>Activity Log</h2>
            <div class="count-badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</div>
          </div>

          <app-notification-filters
            [currentFilter]="logFilter()"
            [totalCount]="notifications().length"
            [unreadCount]="unreadCount()"
            (onFilterChange)="logFilter.set($event)"
            (onSearch)="searchQuery.set($event)"
          ></app-notification-filters>

          <app-notification-list
            [notifications]="paginatedNotifications()"
            [hasMore]="filteredNotifications().length > visibleCount()"
            [remainingCount]="filteredNotifications().length - visibleCount()"
            (onMarkRead)="handleMarkRead($event)"
            (onAccept)="handleAcceptFromLog($event)"
            (onDecline)="handleRejectInvite($event.id)"
            (onLoadMore)="visibleCount.set(visibleCount() + 5)"
          ></app-notification-list>
        </div>

        <!-- Dispatcher (RIGHT) -->
        <div class="dispatch-column">
          <div class="dispatch-sticky">
            <app-notification-dispatcher
              [form]="dispatchForm"
              [targets]="filteredTargets()"
              [isDispatching]="isDispatching()"
              [showStaffOption]="featureService.isOwner() || featureService.isReceptionist()"
              [showMembersOption]="featureService.isOwner() || featureService.isTrainer()"
              [roleLabels]="roleLabels()"
              [tipText]="tipText()"
              (onSubmit)="onDispatch()"
              (onReset)="resetForm()"
            ></app-notification-dispatcher>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-page {
      padding: clamp(1.5rem, 5vw, 4rem);
      max-width: 1440px;
      margin: 0 auto;
      min-height: 100vh;
      background:
        radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.03) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.03) 0%, transparent 50%);
    }

    .page-header {
      margin-bottom: 4rem;
      h1 {
        font-size: clamp(2.5rem, 8vw, 4rem);
        font-weight: 900;
        letter-spacing: -0.05em;
        background: linear-gradient(135deg, var(--admin-accent-indigo) 0%, var(--admin-accent-emerald) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        line-height: 1.1;
      }
      .subtitle {
        font-size: 1.2rem;
        font-weight: 500;
        color: var(--admin-text-secondary);
        margin-top: 1rem;
        max-width: 600px;
        line-height: 1.6;
        opacity: 0.8;
      }
    }

    .main-grid {
      display: grid;
      grid-template-columns: 1fr 440px;
      gap: 3rem;
      align-items: start;
    }

    .activity-column { display: flex; flex-direction: column; gap: 2rem; }
    
    .section-badge {
      display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0;
      h2 { font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: var(--admin-text-primary); margin: 0; }
    }

    .count-badge {
      padding: 0.25rem 0.6rem;
      background: var(--admin-accent-indigo);
      color: white;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 800;
    }

    .dispatch-column { position: relative; }
    .dispatch-sticky { position: sticky; top: 2rem; }

    @media (max-width: 1200px) {
      .main-grid { grid-template-columns: 1fr; }
      .dispatch-sticky { position: static; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit {
  protected featureService = inject(NotificationFeatureService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Expose signals from service
  notifications = this.featureService.notifications;
  unreadCount = this.featureService.unreadCount;
  invitations = this.featureService.invitations;
  
  // Local UI State
  logFilter = signal<NotificationLogFilter>('all');
  searchQuery = signal('');
  visibleCount = signal(5);
  isDispatching = signal(false);

  // Computed views
  headerSubtitle = computed(() => {
    if (this.featureService.isAdmin()) return 'Broadcast system announcements or send direct commands to gym owners.';
    if (this.featureService.isOwner()) return 'Send alerts to your gym staff or broadcast updates to all active members.';
    if (this.featureService.isReceptionist()) return 'Send internal alerts to your fellow gym staff team.';
    if (this.featureService.isTrainer()) return 'Send messages directly to your active training members.';
    return 'Manage your notifications and system alerts.';
  });

  roleLabels = computed(() => ({
    all: this.featureService.isTrainer() ? 'Members' : (this.featureService.isAdmin() ? 'Users' : 'Targets'),
    single: this.featureService.isTrainer() ? 'Member' : (this.featureService.isAdmin() ? 'Owner' : 'Single User')
  }));

  tipText = computed(() => {
    if (this.featureService.isAdmin()) return 'Direct commands are instantly received by the selected gym owner\'s dashboard.';
    if (this.featureService.isOwner()) return 'Staff and members will see these notifications in their dashboard and mobile apps.';
    if (this.featureService.isReceptionist()) return 'Staff members will see these broadcasted alerts in their notification logs.';
    if (this.featureService.isTrainer()) return 'Direct messages are delivered to the member\'s application inbox.';
    return 'Notifications are delivered instantly to the target recipients.';
  });

  filteredNotifications = computed(() => {
    const filter = this.logFilter();
    const list = this.notifications();
    return filter === 'unread' ? list.filter(n => n.unread) : list;
  });

  paginatedNotifications = computed(() => {
    return this.filteredNotifications().slice(0, this.visibleCount());
  });

  filteredTargets = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const all = this.featureService.targets();
    if (!query) return all;
    return all.filter(t => 
      `${t.name} ${t.last_name}`.toLowerCase().includes(query) ||
      t.email?.toLowerCase().includes(query)
    );
  });

  dispatchForm = this.fb.group({
    recipientType: ['all', Validators.required],
    type: ['info', Validators.required],
    targetId: [''],
    message: ['', [Validators.required, Validators.minLength(5)]],
  });

  ngOnInit() {
    this.featureService.loadInitialData();

    this.dispatchForm.get('recipientType')?.valueChanges.subscribe((type) => {
      const targetControl = this.dispatchForm.get('targetId');
      if (type === 'single') {
        targetControl?.setValidators([Validators.required]);
      } else {
        targetControl?.clearValidators();
      }
      targetControl?.updateValueAndValidity();
    });
  }

  handleAcceptInvite(invitation: StaffInvitation) {
    this.featureService.acceptInvitation(invitation).subscribe({
      next: () => this.snackBar.open('Invitation accepted! Welcome to the gym staff.', 'Awesome', { duration: 3000 }),
      error: () => this.snackBar.open('Failed to join gym.', 'Close', { duration: 3000 })
    });
  }

  handleRejectInvite(id: string) {
    this.featureService.declineInvitation(id).subscribe({
      next: () => this.snackBar.open('Invitation declined.', 'Close', { duration: 3000 })
    });
  }

  handleMarkRead(id: string) {
    this.featureService.markAsRead(id);
  }

  handleAcceptFromLog(notif: GymNotification) {
    this.featureService.acceptInviteFromAction(notif).subscribe({
      next: () => {
        this.snackBar.open('Invitation accepted! Welcome.', 'Awesome', { duration: 3000 });
        setTimeout(() => window.location.reload(), 1500);
      },
      error: () => this.snackBar.open('Failed to join gym.', 'Close', { duration: 3000 })
    });
  }

  onDispatch() {
    if (this.dispatchForm.invalid) return;

    this.isDispatching.set(true);
    const { recipientType, type, targetId, message } = this.dispatchForm.getRawValue();

    if (recipientType === 'all' && (this.featureService.isSuperAdmin() || (this.featureService.isAdmin() && !this.featureService.isOwner()))) {
      this.featureService.broadcastToAll(message!, type!).subscribe({
        next: () => this.handleSuccess('Announcement broadcasted to all users.'),
        error: () => this.handleError('Failed to broadcast message.'),
      });
      return;
    }

    // Direct and grouped sending
    let targets = this.filteredTargets();
    if (recipientType === 'staff') targets = targets.filter(t => t.role !== 'member');
    if (recipientType === 'members') targets = targets.filter(t => t.role === 'member');
    if (recipientType === 'single') targets = targets.filter(t => t.id_user === targetId);

    if (targets.length === 0) {
      this.handleError('No recipients found in this group.');
      return;
    }

    const requests = targets.map(t => this.featureService.dispatchNotification({ 
      id_user: t.id_user!, 
      message: message!, 
      type: type! 
    }));

    forkJoin(requests).subscribe({
      next: (results: any[]) => this.handleSuccess(`Messages sent to ${results.length} recipients.`),
      error: () => this.handleError('Failed to send messages to some recipients.')
    });
  }

  private handleSuccess(msg: string) {
    this.snackBar.open(msg, 'Dismiss', { duration: 3000 });
    this.resetForm();
    this.isDispatching.set(false);
  }

  private handleError(msg: string) {
    this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
    this.isDispatching.set(false);
  }

  resetForm() {
    this.dispatchForm.reset({ recipientType: 'all', type: 'info', targetId: '', message: '' });
  }
}
