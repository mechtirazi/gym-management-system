import { Component, OnInit, inject, signal, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { catchError, map, of, forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { environment } from '../../../../environments/environment';
import { AdminOwnersService } from '../../../core/services/admin-owners.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminAnalyticsService, PlatformMetrics } from '../../../core/services/admin-analytics.service';
import { NotificationDto, UserVm } from '../../../core/models/api.models';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule, MatDialogModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private ownersService = inject(AdminOwnersService);
  private notificationsService = inject(NotificationService);
  private analyticsService = inject(AdminAnalyticsService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  loading = signal(false);
  loadingHealth = signal(true);

  totalOwners = signal(0);
  verifiedOwners = signal(0);
  unverifiedOwners = signal(0);
  verifiedTrend = signal(0);



  notifications = signal<NotificationDto[]>([]);

  apiHealth = signal<'Reachable' | 'Unreachable' | 'Checking'>('Checking');
  healthDetail = signal('');

  // God View Platform Metrics
  loadingMetrics = signal(true);
  errorMetrics = signal<string | null>(null);
  mrr = signal(0);
  activeGyms = signal(0);
  totalOwnersMetric = signal(0);
  totalMembers = signal(0);
  upgradedMembers = signal(0);
  recentChurn = signal(0);

  owners = signal<UserVm[]>([]);
  broadcasting = signal(false);
  sendingTargeted = signal(false);

  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  broadcastForm = this.fb.group({
    type: ['info', Validators.required],
    message: ['', [Validators.required, Validators.minLength(5)]]
  });

  targetedForm = this.fb.group({
    ownerId: ['', Validators.required],
    type: ['info', Validators.required],
    message: ['', [Validators.required, Validators.minLength(5)]]
  });



  constructor() {
    afterNextRender(() => {
      this.refreshData();
      this.checkHealth();
    });
  }

  ngOnInit() {
    this.loadPlatformMetrics();
  }

  processData({ owners, notifications }: any) {
    const currentUserId = this.authService.currentUser()?.id_user;

    // Owners stats
    const verified = owners.filter((o: any) => !!o.email_verified_at);
    this.totalOwners.set(owners.length);
    this.verifiedOwners.set(verified.length);
    this.unverifiedOwners.set(owners.length - verified.length);
    this.verifiedTrend.set(owners.length ? Math.round((verified.length / owners.length) * 100) / 10 : 0);

    // Notifications
    this.notifications.set(notifications.slice(0, 5));

    // Filter out current user from the dropdown list
    const filteredOwners = owners.filter((o: any) => o.id_user !== currentUserId);
    this.owners.set(filteredOwners);
    this.loading.set(false);
  }

  refreshData() {
    this.loading.set(true);

    forkJoin({
      owners: this.ownersService.getOwners().pipe(catchError(() => of([] as UserVm[]))),
      notifications: this.notificationsService.getNotifications().pipe(catchError(() => of([] as NotificationDto[])))
    }).subscribe({
      next: (data) => this.processData(data),
      error: () => this.loading.set(false)
    });
  }

  loadPlatformMetrics() {
    this.loadingMetrics.set(true);
    this.errorMetrics.set(null);
    console.log('[GodView] Fetching platform metrics...');
    this.analyticsService.getPlatformMetrics().pipe(
      catchError((err) => {
        console.error('[GodView] Metrics fetch failed:', err);
        this.errorMetrics.set('Failed to load platform metrics. Please try again.');
        return of({ 
          total_active_gyms: 0, 
          total_active_owners: 0, 
          total_members: 0, 
          upgraded_members: 0, 
          mrr: 0, 
          recent_churn: 0 
        } as PlatformMetrics);
      })
    ).subscribe(metrics => {
      console.log('[GodView] Metrics received:', metrics);
      this.mrr.set(metrics.mrr);
      this.activeGyms.set(metrics.total_active_gyms);
      this.totalOwnersMetric.set(metrics.total_active_owners);
      this.totalMembers.set(metrics.total_members);
      this.upgradedMembers.set(metrics.upgraded_members);
      this.recentChurn.set(metrics.recent_churn);
      this.loadingMetrics.set(false);
    });
  }

  checkHealth() {
    this.loadingHealth.set(true);
    // Use the API URL which we know has CORS enabled, rather than /up which might not
    this.http.get(`${environment.apiUrl}/admin/metrics/overview`, { observe: 'response' }).pipe(
      map(res => {
        if (res.status >= 200 && res.status < 300) {
          return { ok: true, detail: 'API Systems Online' };
        }
        return { ok: false, detail: `API responds with status ${res.status}` };
      }),
      catchError(() => of({ ok: false, detail: 'API Node Unreachable' }))
    ).subscribe(result => {
      this.apiHealth.set(result.ok ? 'Reachable' : 'Unreachable');
      this.healthDetail.set(result.detail);
      this.loadingHealth.set(false);
    });
  }

  async openCreateOwner() {
    const { OwnerDialogComponent } = await import('../owners/owner-dialog/owner-dialog.component');
    const dialogRef = this.dialog.open(OwnerDialogComponent, {
      width: '700px',
      disableClose: true,
      data: { user: undefined }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) this.refreshData();
    });
  }

  sendBroadcast() {
    if (this.broadcastForm.invalid) return;
    this.broadcasting.set(true);
    const { type, message } = this.broadcastForm.value;
    this.notificationsService.sendToAllUsers(message!, type!).subscribe({
      next: () => {
        this.toastService.success('Announcement broadcasted to all users.');
        this.broadcastForm.reset({ type: 'info', message: '' });
        this.broadcasting.set(false);
        this.refreshData();
      },
      error: () => {
        this.toastService.error('Failed to send broadcast.');
        this.broadcasting.set(false);
      }
    });
  }

  isAllOwnersMode = signal(false);

  toggleAllOwnersMode() {
    this.isAllOwnersMode.update(v => !v);
    const ownerControl = this.targetedForm.get('ownerId');
    if (this.isAllOwnersMode()) {
      ownerControl?.clearValidators();
      ownerControl?.setValue('all_owners');
    } else {
      ownerControl?.setValidators([Validators.required]);
      ownerControl?.setValue('');
    }
    ownerControl?.updateValueAndValidity();
  }

  sendTargeted() {
    if (this.targetedForm.invalid) return;
    this.sendingTargeted.set(true);
    const { ownerId, type, message } = this.targetedForm.value;
    const isAll = this.isAllOwnersMode() || ownerId === 'all_owners';

    const request = isAll
      ? this.notificationsService.sendToAllOwners(message!, type!)
      : this.notificationsService.sendToOwner(ownerId!, message!, type!);

    request.subscribe({
      next: () => {
        const successMsg = isAll
          ? 'Broadcast alert sent to all owners.'
          : 'Direct alert sent to owner.';
        this.toastService.success(successMsg);
        this.targetedForm.reset({ ownerId: '', type: 'info', message: '' });
        this.sendingTargeted.set(false);
        this.refreshData();
      },
      error: () => {
        this.toastService.error('Failed to send target message.');
        this.sendingTargeted.set(false);
      }
    });
  }

  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  goToOwners() {
    this.router.navigate(['/admin/owners']);
  }

  getOwnerAvatar(path?: string | null): string {
    return this.authService.getAvatarUrl(path);
  }
}
