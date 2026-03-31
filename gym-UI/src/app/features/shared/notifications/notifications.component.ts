import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminOwnersService } from '../../../core/services/admin-owners.service';
import { UserVm } from '../../../core/models/api.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="notifications-page">
      <header class="page-header">
        <div class="header-content">
          <h1>Notifications Hub</h1>
          <p class="subtitle">Broadcast system announcements or send direct commands to gym owners</p>
        </div>
      </header>

      <div class="main-grid">
        <!-- Activity Log (LEFT) -->
        <div class="activity-column">
          <div class="section-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <h2>Activity Log</h2>
            <div class="count-badge" *ngIf="notifications().length > 0">{{ notifications().length }}</div>
          </div>

          <div class="notifications-scroll">
            <div class="notifications-list" *ngIf="notifications().length > 0; else emptyState">
              @for (notif of notifications(); track notif.id) {
                <div class="notification-card" [class.unread]="notif.unread">
                  <div class="card-icon" [class.info]="notif.type === 'info'" [class.error]="notif.type === 'error'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </div>
                  <div class="card-content">
                    <div class="card-header">
                      <h3 class="card-title">{{ notif.title }}</h3>
                      <span class="card-time">{{ notif.time }}</span>
                    </div>
                    <p class="card-desc">{{ notif.description }}</p>
                    <div class="card-actions">
                      <button class="action-btn secondary" (click)="markAsRead(notif.id)" *ngIf="notif.unread">
                        Mark as read
                      </button>
                    </div>
                  </div>
                </div>
              }
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
        </div>

        <!-- Dispatcher (RIGHT) -->
        <div class="dispatch-column">
          <div class="dispatch-sticky">
            <div class="section-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 2L11 13"></path>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
              <h2>Command Center</h2>
            </div>

            <div class="dispatch-card">
              <div class="card-glow"></div>
              <form [formGroup]="dispatchForm" (ngSubmit)="onDispatch()" class="dispatch-form">
                <div class="form-field">
                  <label>Recipients</label>
                  <div class="radio-group">
                    <label class="radio-btn">
                      <input type="radio" formControlName="recipientType" value="all">
                      <span class="btn-content">All Users</span>
                    </label>
                    <label class="radio-btn">
                      <input type="radio" formControlName="recipientType" value="owner">
                      <span class="btn-content">Owner</span>
                    </label>
                  </div>
                </div>

                <div class="form-field owner-select" *ngIf="dispatchForm.get('recipientType')?.value === 'owner'" [@slideIn]>
                  <label>Select Target Owner</label>
                  <select formControlName="ownerId">
                    <option value="" disabled>Select recipient...</option>
                    <option *ngFor="let o of owners()" [value]="o.id_user">{{ o.name }} {{ o.last_name }}</option>
                  </select>
                </div>

                <div class="form-field">
                  <label>Message Content</label>
                  <textarea formControlName="message" placeholder="Type your notification message..."></textarea>
                  <div class="char-count">{{ dispatchForm.get('message')?.value?.length || 0 }} chars</div>
                </div>

                <div class="form-actions">
                  <button type="submit" [disabled]="dispatchForm.invalid || isDispatching()" class="dispatch-btn">
                    <span *ngIf="!isDispatching()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; margin-right: 8px;">
                        <path d="M22 2L11 13"></path>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                      </svg>
                      Dispatch
                    </span>
                    <span *ngIf="isDispatching()" class="loader-state">
                      <svg class="spinner" viewBox="0 0 50 50">
                        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                      </svg>
                    </span>
                  </button>
                  <button type="button" (click)="resetForm()" class="reset-btn">Reset</button>
                </div>
              </form>
            </div>
            
            <div class="tips-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <p>Direct commands are instantly received by the selected gym owner's dashboard.</p>
            </div>
          </div>
        </div>
      </div>
  `,
  styles: [`
    .notifications-page {
      padding: 3rem;
      max-width: 1400px;
      margin: 0 auto;
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-header {
      margin-bottom: 4rem;
      text-align: left;
      position: relative;

      h1 {
        font-size: 3.5rem;
        font-weight: 900;
        letter-spacing: -0.04em;
        background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #d946ef 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        line-height: 1;
      }

      .subtitle {
        font-size: 1.25rem;
        font-weight: 500;
        color: #64748b;
        margin-top: 1rem;
        max-width: 600px;
        line-height: 1.6;
        :host-context(.dark) & { color: #94a3b8; }
      }
    }

    .main-grid {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 4rem;
      align-items: start;
    }

    /* Column Headers Style */
    .section-badge {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 2px solid rgba(0,0,0,0.03);
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: -2px; left: 0; width: 60px; height: 2px;
        background: #0ea5e9;
      }

      h2 {
        font-size: 1.2rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: #0f172a;
        margin: 0;
        :host-context(.dark) & { color: white; }
      }

      svg { 
        width: 24px; height: 24px; color: #0ea5e9;
        filter: drop-shadow(0 0 8px rgba(14, 165, 233, 0.4));
      }
    }

    /* Activity Log (LEFT) */
    .activity-column {
      animation: slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .notification-card {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0,0,0,0.04);
      border-radius: 28px;
      padding: 2rem;
      display: flex;
      gap: 1.5rem;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;

      &:hover {
        transform: scale(1.02) translateX(10px);
        background: white;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
        border-color: rgba(14, 165, 233, 0.2);
      }

      &.unread {
        background: rgba(14, 165, 233, 0.03);
        border-color: rgba(14, 165, 233, 0.15);
        &::after {
          content: '';
          position: absolute;
          top: 2rem; right: 2rem;
          width: 12px; height: 12px;
          background: #0ea5e9;
          border-radius: 50%;
          box-shadow: 0 0 15px #0ea5e9;
          animation: pulse 2s infinite;
        }
      }

      :host-context(.dark) & {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.05);
        &:hover { background: rgba(255, 255, 255, 0.05); }
      }
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }

    .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
      box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1);

      &.info { background: linear-gradient(135deg, #0ea5e9, #3b82f6); }
      &.error { background: linear-gradient(135deg, #ef4444, #dc2626); }
      svg { width: 28px; height: 28px; }
    }

    .card-content { flex: 1; min-width: 0; }
    .card-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem; }
    .card-title { font-size: 1.3rem; font-weight: 800; color: #1e293b; margin: 0; :host-context(.dark) & { color: white; } }
    .card-time { font-size: 0.9rem; font-weight: 600; color: #94a3b8; }
    .card-desc { font-size: 1.05rem; color: #475569; line-height: 1.7; margin: 0; :host-context(.dark) & { color: #cbd5e1; } }

    .action-btn {
      margin-top: 1.5rem;
      padding: 0.6rem 1.25rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.3s;
      &.secondary {
        background: rgba(148, 163, 184, 0.1);
        border: none;
        color: #475569;
        &:hover { background: #0ea5e9; color: white; transform: translateY(-2px); }
        :host-context(.dark) & { color: #94a3b8; &:hover { color: white; } }
      }
    }

    /* Dispatch Column (RIGHT) */
    .dispatch-column {
      animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .dispatch-sticky {
      position: sticky;
      top: 3rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .dispatch-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(20px);
      border-radius: 32px;
      padding: 2.5rem;
      border: 1px solid rgba(0,0,0,0.05);
      box-shadow: 0 40px 80px -20px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;

      :host-context(.dark) & { background: rgba(30, 41, 59, 0.5); border-color: rgba(255, 255, 255, 0.08); }

      .card-glow {
        position: absolute;
        top: 0; left: 0; right: 0; height: 8px;
        background: linear-gradient(90deg, #0ea5e9, #6366f1, #d946ef);
      }
    }

    .dispatch-form { display: flex; flex-direction: column; gap: 2rem; }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      label { font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; }
    }

    .radio-group {
      display: flex;
      background: rgba(241, 245, 249, 0.8);
      padding: 0.4rem;
      border-radius: 16px;
      gap: 0.4rem;
      :host-context(.dark) & { background: rgba(0,0,0,0.2); }
    }

    .radio-btn {
      flex: 1;
      cursor: pointer;
      input { display: none; }
      .btn-content {
        display: flex; justify-content: center; padding: 0.75rem; border-radius: 12px;
        font-size: 0.9rem; font-weight: 700; color: #64748b; transition: all 0.3s;
      }
      input:checked + .btn-content {
        background: white;
        color: #0ea5e9;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        :host-context(.dark) & { background: #334155; color: white; }
      }
    }

    .form-field select, .form-field textarea {
      padding: 1rem 1.25rem; border-radius: 18px; border: 2px solid rgba(0,0,0,0.04); background: #f8fafc;
      font-size: 1rem; font-weight: 500; outline: none; transition: all 0.3s;
      &:focus {
        border-color: #0ea5e9;
        background: white;
        box-shadow: 0 0 0 6px rgba(14, 165, 233, 0.08);
      }
      :host-context(.dark) & { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.05); color: white; }
    }

    .form-field textarea { height: 160px; resize: none; line-height: 1.6; }
    .char-count { align-self: flex-end; font-size: 0.8rem; font-weight: 600; color: #94a3b8; margin-top: -1.5rem; }

    .form-actions { display: grid; grid-template-columns: 1fr auto; gap: 1.5rem; align-items: center; margin-top: 1rem; }

    .dispatch-btn {
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: white; border: none; padding: 1.1rem; border-radius: 20px;
      font-size: 1.1rem; font-weight: 800; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex; align-items: center; justify-content: center;
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 40px rgba(99, 102, 241, 0.4);
      }
      &:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }
    }

    .reset-btn {
      background: transparent; border: none; font-size: 0.9rem; font-weight: 700; color: #94a3b8;
      cursor: pointer; transition: color 0.2s;
      &:hover { color: #64748b; }
    }

    .tips-box {
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(99, 102, 241, 0.08));
      border: 1px solid rgba(14, 165, 233, 0.1);
      border-radius: 24px;
      padding: 1.75rem;
      display: flex; gap: 1.25rem;
      align-items: start;
      svg { width: 24px; height: 24px; color: #0ea5e9; flex-shrink: 0; }
      p { font-size: 0.95rem; color: #475569; margin: 0; line-height: 1.7; :host-context(.dark) & { color: #94a3b8; } }
    }

    .empty-state { text-align: center; padding: 8rem 0; color: #94a3b8;
      .empty-icon { width: 100px; height: 100px; background: rgba(0,0,0,0.03); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; color: #cbd5e1; svg { width: 50px; height: 50px; } }
      h2 { font-size: 1.75rem; font-weight: 900; color: #1e293b; margin-bottom: 0.5rem; :host-context(.dark) & { color: white; } }
      p { font-size: 1.1rem; }
    }

    .spinner { animation: rotate 2s linear infinite; width: 24px; height: 24px; }
    .path { stroke: white; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; }
    @keyframes rotate { 100% { transform: rotate(360deg); } }
    @keyframes dash { 0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; } 50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; } 100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; } }

    @media (max-width: 1200px) { .main-grid { grid-template-columns: 1fr; gap: 4rem; } .dispatch-sticky { position: static; } .dispatch-card { max-width: 600px; } }
    @media (max-width: 768px) { .notifications-page { padding: 1.5rem; } .page-header h1 { font-size: 2.5rem; } }
  `]
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private ownersService = inject(AdminOwnersService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  notifications = this.notificationService.notifications;
  hasUnread = this.notificationService.hasUnread;
  isAdmin = () => {
    const role = this.authService.currentUser()?.role;
    return role === 'admin' || role === 'super_admin';
  };

  owners = signal<UserVm[]>([]);
  isDispatching = signal(false);

  dispatchForm = this.fb.group({
    recipientType: ['all', Validators.required],
    ownerId: [''],
    message: ['', [Validators.required, Validators.minLength(5)]]
  });

  ngOnInit() {
    this.loadOwners();

    this.dispatchForm.get('recipientType')?.valueChanges.subscribe(type => {
      const ownerControl = this.dispatchForm.get('ownerId');
      if (type === 'owner') {
        ownerControl?.setValidators([Validators.required]);
      } else {
        ownerControl?.clearValidators();
      }
      ownerControl?.updateValueAndValidity();
    });
  }

  loadOwners() {
    this.ownersService.getOwners().subscribe(owners => {
      this.owners.set(owners);
    });
  }

  onDispatch() {
    if (this.dispatchForm.invalid) return;
    
    this.isDispatching.set(true);
    const { recipientType, ownerId, message } = this.dispatchForm.value;

    if (recipientType === 'all') {
      this.notificationService.sendToAllUsers(message!).subscribe({
        next: () => this.handleSuccess('Announcement broadcasted to all users.'),
        error: () => this.handleError('Failed to broadcast message.')
      });
    } else {
      this.notificationService.sendToOwner(ownerId!, message!).subscribe({
        next: () => this.handleSuccess('Direct alert sent to owner.'),
        error: () => this.handleError('Failed to send target message.')
      });
    }
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
    this.dispatchForm.reset({ recipientType: 'all', ownerId: '', message: '' });
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }
}
