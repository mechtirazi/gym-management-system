import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminOwnersService } from '../../../core/services/admin-owners.service';
import { TrainerService } from '../../trainer/services/trainer.service';
import { StaffService } from '../../owner/staff/services/staff.service';
import { MemberService } from '../../owner/member/services/member.service';
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
          <p class="subtitle" *ngIf="isAdmin()">Broadcast system announcements or send direct commands to gym owners.</p>
          <p class="subtitle" *ngIf="isOwner()">Send alerts to your gym staff or broadcast updates to all active members.</p>
          <p class="subtitle" *ngIf="isReceptionist()">Send internal alerts to your fellow gym staff team.</p>
          <p class="subtitle" *ngIf="isTrainer()">Send messages directly to your active training members.</p>
        </div>
      </header>

      <div class="main-grid">
        <!-- Activity Log (LEFT) -->
        <div class="activity-column">
          <div class="section-badge" *ngIf="invitations().length > 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
            <h2>Staff Invitations</h2>
            <div class="count-badge pulse">{{ invitations().length }}</div>
          </div>

          <div class="invitations-list" *ngIf="invitations().length > 0">
            @for (invite of invitations(); track invite.id_notification) {
              <div class="invite-card glass-card" [@slideIn]>
                <div class="invite-info">
                  <div class="gym-icon">
                    <span>{{ invite.gym_name?.charAt(0) || 'G' }}</span>
                  </div>
                  <div class="invite-text">
                    <h3>Join {{ invite.gym_name }}</h3>
                    <p>Hiring for {{ invite.role }} position</p>
                  </div>
                </div>
                <div class="invite-actions">
                  <button class="accept-btn" (click)="acceptInvite(invite)">Accept</button>
                  <button class="reject-btn" (click)="rejectInvite(invite.id_notification)">Decline</button>
                </div>
              </div>
            }
          </div>

          <div class="section-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <h2>Activity Log</h2>
            <div class="count-badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</div>
          </div>

          <div class="log-filters">
            <button class="filter-tab" [class.active]="logFilter() === 'all'" (click)="logFilter.set('all')">
              All <span>({{ notifications().length }})</span>
            </button>
            <button class="filter-tab" [class.active]="logFilter() === 'unread'" (click)="logFilter.set('unread')">
              Unread <span>({{ unreadCount() }})</span>
            </button>
          </div>

          <div class="notifications-scroll">
            <div class="notifications-list" *ngIf="paginatedNotifications().length > 0; else emptyState">
              @for (notif of paginatedNotifications(); track notif.id) {
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

            <div class="load-more-wrap" *ngIf="filteredNotifications().length > visibleCount()">
              <button class="load-more-btn" (click)="visibleCount.set(visibleCount() + 5)">
                Show More ({{ filteredNotifications().length - visibleCount() }} left)
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
                      <span class="btn-content">All</span>
                    </label>
                    <label class="radio-btn" *ngIf="isOwner() || isReceptionist()">
                      <input type="radio" formControlName="recipientType" value="staff">
                      <span class="btn-content">Staff</span>
                    </label>
                    <label class="radio-btn" *ngIf="isOwner() || isTrainer()">
                      <input type="radio" formControlName="recipientType" value="members">
                      <span class="btn-content">Members</span>
                    </label>
                    <label class="radio-btn">
                      <input type="radio" formControlName="recipientType" value="single">
                      <span class="btn-content">Single</span>
                    </label>
                  </div>
                </div>

                <div class="form-field owner-select" *ngIf="dispatchForm.get('recipientType')?.value === 'single'" [@slideIn]>
                  <label>Search & Select {{ (isOwner() || isReceptionist()) ? 'User' : (isTrainer() ? 'Member' : 'Owner') }}</label>
                  <div class="search-input-wrapper">
                    <input type="text" placeholder="Search by name..." (input)="searchQuery.set($any($event.target).value)" class="target-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="M21 21L16.65 16.65"></path>
                    </svg>
                  </div>
                  <select formControlName="targetId">
                    <option value="" disabled>Select recipient...</option>
                    <option *ngFor="let t of filteredTargets()" [value]="t.id_user">{{ t.name }} {{ t.last_name }} ({{ t.role || 'Member' }})</option>
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
              <p *ngIf="isAdmin()">Direct commands are instantly received by the selected gym owner's dashboard.</p>
              <p *ngIf="isOwner()">Staff and members will see these notifications in their dashboard and mobile apps.</p>
              <p *ngIf="isReceptionist()">Staff members will see these broadcasted alerts in their notification logs.</p>
              <p *ngIf="isTrainer()">Direct messages are delivered to the member's application inbox.</p>
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
      background: radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.03) 0%, transparent 50%),
                  radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.03) 0%, transparent 50%);
    }

    .page-header {
      margin-bottom: 4rem;
      animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);

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

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .main-grid {
      display: grid;
      grid-template-columns: 1fr 440px;
      gap: 3rem;
      align-items: start;
    }

    /* Activity Log (LEFT) */
    .activity-column {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .section-badge {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;

      h2 {
        font-size: 1rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--admin-text-primary);
        margin: 0;
      }

      svg { 
        width: 20px; 
        height: 20px; 
        color: var(--admin-accent-indigo);
      }

      .count-badge {
        background: var(--admin-accent-indigo);
        color: white;
        font-size: 0.75rem;
        font-weight: 900;
        padding: 2px 10px;
        border-radius: 100px;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      }
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .notification-card {
      background: var(--admin-glass);
      backdrop-filter: blur(12px);
      border: 1px solid var(--admin-glass-border);
      box-shadow: var(--admin-glass-shadow);
      border-radius: 24px;
      padding: 1.75rem;
      display: flex;
      gap: 1.5rem;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;

      &:hover {
        transform: translateY(-4px) scale(1.01);
        border-color: var(--admin-accent-indigo);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
      }

      &.unread {
        background: linear-gradient(135deg, var(--admin-glass), rgba(99, 102, 241, 0.05));
        border-left: 4px solid var(--admin-accent-indigo);
        
        &::before {
          content: '';
          position: absolute;
          top: 1.5rem; right: 1.5rem;
          width: 8px; height: 8px;
          background: var(--admin-accent-indigo);
          border-radius: 50%;
          box-shadow: 0 0 15px var(--admin-accent-indigo);
          animation: pulse 2s infinite;
        }
      }
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
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

      &.info { color: var(--admin-accent-indigo); background: rgba(99, 102, 241, 0.1); }
      &.error { color: var(--admin-accent-rose); background: rgba(244, 63, 94, 0.1); }
      svg { width: 22px; height: 22px; }
    }

    .card-content { flex: 1; min-width: 0; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
    .card-title { font-size: 1.1rem; font-weight: 800; color: var(--admin-text-primary); margin: 0; }
    .card-time { font-size: 0.8rem; font-weight: 600; color: var(--admin-text-secondary); opacity: 0.6; }
    .card-desc { font-size: 0.95rem; color: var(--admin-text-secondary); line-height: 1.6; margin: 0; }

    .card-actions {
      margin-top: 1rem;
      display: flex;
      justify-content: flex-end;
    }

    .action-btn {
      padding: 0.5rem 1rem;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.3s;
      
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
    }

    /* Dispatch Column (RIGHT) */
    .dispatch-sticky {
      position: sticky;
      top: 2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

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
        top: 0; left: 0; right: 0; height: 4px;
        background: linear-gradient(90deg, var(--admin-accent-indigo), var(--admin-accent-emerald));
      }
    }

    .dispatch-form { display: flex; flex-direction: column; gap: 1.5rem; }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      label { font-size: 0.75rem; font-weight: 800; color: var(--admin-text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }
    }

    .radio-group {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      background: var(--admin-item-bg);
      padding: 4px;
      border-radius: 14px;
      border: 1px solid var(--admin-item-border);
    }

    .radio-btn {
      cursor: pointer;
      input { display: none; }
      .btn-content {
        display: flex; 
        justify-content: center; 
        padding: 0.6rem; 
        border-radius: 10px;
        font-size: 0.85rem; 
        font-weight: 700; 
        color: var(--admin-text-secondary); 
        transition: all 0.3s;
      }
      input:checked + .btn-content {
        background: var(--admin-accent-indigo);
        color: white;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      }
    }

    .form-field select, .form-field textarea {
      padding: 1rem; 
      border-radius: 16px; 
      border: 1px solid var(--admin-item-border); 
      background: var(--admin-item-bg);
      color: var(--admin-text-primary);
      font-size: 0.95rem; 
      font-weight: 500; 
      outline: none; 
      transition: all 0.3s;
      
      &:focus {
        border-color: var(--admin-accent-indigo);
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
      }
    }

    .form-field textarea { height: 140px; resize: none; line-height: 1.6; }
    .char-count { align-self: flex-end; font-size: 0.7rem; font-weight: 600; color: var(--admin-text-secondary); opacity: 0.6; margin-top: 0.5rem; }

    .form-actions { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }

    .dispatch-btn {
      background: var(--admin-accent-indigo);
      color: white; 
      border: none; 
      padding: 1rem; 
      border-radius: 16px;
      font-size: 1rem; 
      font-weight: 800; 
      cursor: pointer; 
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex; 
      align-items: center; 
      justify-content: center;
      
      &:hover:not(:disabled) {
        background: #4f46e5;
        transform: translateY(-2px);
        box-shadow: 0 12px 24px rgba(99, 102, 241, 0.3);
      }
      
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .reset-btn {
      background: transparent; border: none; font-size: 0.85rem; font-weight: 700; color: var(--admin-text-secondary);
      cursor: pointer; transition: color 0.2s;
      &:hover { color: var(--admin-text-primary); }
    }

    .tips-box {
      background: var(--admin-glass);
      backdrop-filter: blur(10px);
      border: 1px solid var(--admin-glass-border);
      border-radius: 24px;
      padding: 1.5rem;
      display: flex; gap: 1rem;
      align-items: center;
      
      svg { width: 20px; height: 20px; color: var(--admin-accent-indigo); flex-shrink: 0; }
      p { font-size: 0.85rem; color: var(--admin-text-secondary); margin: 0; line-height: 1.5; font-weight: 500; }
    }

    .empty-state { 
      text-align: center; 
      padding: 5rem 2rem;
      background: var(--admin-glass);
      border-radius: 32px;
      border: 1px dashed var(--admin-glass-border);
      
      .empty-icon { 
        width: 80px; height: 80px; 
        background: var(--admin-item-bg); 
        border-radius: 50%; 
        display: flex; align-items: center; justify-content: center; 
        margin: 0 auto 2rem; 
        color: var(--admin-text-secondary); 
        opacity: 0.3;
        svg { width: 40px; height: 40px; } 
      }
      h2 { font-size: 1.5rem; font-weight: 900; color: var(--admin-text-primary); margin-bottom: 0.5rem; }
      p { font-size: 1rem; color: var(--admin-text-secondary); }
    }

    .spinner { animation: rotate 2s linear infinite; width: 20px; height: 20px; }
    .path { stroke: white; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; }
    @keyframes rotate { 100% { transform: rotate(360deg); } }
    @keyframes dash { 
      0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; } 
      50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; } 
      100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; } 
    }

    /* Filters Styles */
    .log-filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .filter-tab {
      background: var(--admin-glass);
      border: 1px solid var(--admin-glass-border);
      padding: 0.6rem 1.2rem;
      border-radius: 12px;
      color: var(--admin-text-secondary);
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      span { opacity: 0.5; font-size: 0.75rem; }

      &.active {
        background: var(--admin-accent-indigo);
        color: white;
        border-color: var(--admin-accent-indigo);
        box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2);
        span { opacity: 0.8; }
      }

      &:hover:not(.active) {
        background: var(--admin-item-bg);
        transform: translateY(-2px);
      }
    }

    .search-input-wrapper {
      position: relative;
      margin-bottom: 1rem;

      input {
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 2.5rem !important;
        border-radius: 12px !important;
        font-size: 0.85rem !important;
      }

      svg {
        position: absolute;
        left: 0.8rem;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: var(--admin-text-secondary);
        opacity: 0.5;
      }
    }

    .load-more-wrap {
      display: flex;
      justify-content: center;
      margin-top: 2rem;
      padding-bottom: 2rem;
    }

    .load-more-btn {
      background: var(--admin-glass);
      border: 1px solid var(--admin-glass-border);
      padding: 0.8rem 2rem;
      border-radius: 16px;
      color: var(--admin-text-primary);
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 0.75rem;

      svg { width: 18px; height: 18px; transition: transform 0.3s; }

      &:hover {
        background: var(--admin-item-bg);
        border-color: var(--admin-accent-indigo);
        transform: translateY(-2px);
        svg { transform: translateY(2px); }
      }
    }

    .invitations-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .invite-card {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 20px;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      
      .invite-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        
        .gym-icon {
          width: 44px;
          height: 44px;
          background: var(--admin-accent-indigo);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
        }

        .invite-text {
          h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--admin-text-primary); }
          p { margin: 0; font-size: 0.85rem; color: var(--admin-text-secondary); opacity: 0.8; }
        }
      }

      .invite-actions {
        display: flex;
        gap: 0.75rem;
        
        button {
          padding: 0.6rem 1.2rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s;
          border: none;
        }

        .accept-btn {
          background: var(--admin-accent-emerald);
          color: white;
          &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        }

        .reject-btn {
          background: rgba(244, 63, 94, 0.1);
          color: var(--admin-accent-rose);
          &:hover { background: rgba(244, 63, 94, 0.2); }
        }
      }
    }

    @media (max-width: 600px) {
      .invite-card {
        flex-direction: column;
        align-items: stretch;
        .invite-actions { justify-content: stretch; button { flex: 1; } }
      }
    }

    @media (max-width: 1200px) { 
      .main-grid { grid-template-columns: 1fr; } 
      .dispatch-sticky { position: static; } 
      .dispatch-card { max-width: 100%; } 
    }
  `]
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private ownersService = inject(AdminOwnersService);
  private trainerService = inject(TrainerService);
  private staffService = inject(StaffService);
  private memberService = inject(MemberService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  notifications = this.notificationService.notifications;
  hasUnread = this.notificationService.hasUnread;
  unreadCount = this.notificationService.unreadCount;
  
  invitations = signal<any[]>([]);

  isSuperAdmin = () => {
    const role = this.authService.currentUser()?.role;
    return role === 'super_admin';
  };
  isAdmin = () => {
    const role = this.authService.currentUser()?.role;
    return role === 'admin' || role === 'super_admin';
  };
  isOwner = () => {
    const role = this.authService.currentUser()?.role;
    return role === 'owner';
  };
  isTrainer = () => {
    const role = this.authService.currentUser()?.role;
    return role === 'trainer';
  };
  isReceptionist = () => {
    const role = this.authService.currentUser()?.role;
    return role === 'receptionist';
  };

  targets = signal<UserVm[]>([]);
  isDispatching = signal(false);
  
  // New Filters
  logFilter = signal<'all' | 'unread'>('all');
  searchQuery = signal('');
  
  visibleCount = signal(5);
  
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
    const all = this.targets();
    if (!query) return all;
    return all.filter(t => 
      `${t.name} ${t.last_name}`.toLowerCase().includes(query) ||
      t.email?.toLowerCase().includes(query)
    );
  });

  dispatchForm = this.fb.group({
    recipientType: ['all', Validators.required],
    targetId: [''],
    message: ['', [Validators.required, Validators.minLength(5)]]
  });

  ngOnInit() {
    this.loadTargets();
    this.loadInvitations();

    this.dispatchForm.get('recipientType')?.valueChanges.subscribe(type => {
      const targetControl = this.dispatchForm.get('targetId');
      if (type === 'single') {
        targetControl?.setValidators([Validators.required]);
      } else {
        targetControl?.clearValidators();
      }
      targetControl?.updateValueAndValidity();
    });
  }

  loadInvitations() {
    this.staffService.getInvitations().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.invitations.set(res.data);
        }
      }
    });
  }

  acceptInvite(invitation: any) {
    this.staffService.joinGym(invitation).subscribe({
      next: (res: any) => {
        this.snackBar.open('Invitation accepted! Welcome to the gym staff.', 'Awesome', { duration: 3000 });
        this.loadInvitations();
        this.notificationService.fetchNotifications();
      },
      error: () => this.snackBar.open('Failed to join gym.', 'Close', { duration: 3000 })
    });
  }

  rejectInvite(notifId: string) {
    this.staffService.declineInvitation(notifId).subscribe({
      next: () => {
        this.snackBar.open('Invitation declined.', 'Close', { duration: 3000 });
        this.loadInvitations();
        this.notificationService.fetchNotifications();
      }
    });
  }

  loadTargets() {
    if (this.isAdmin()) {
      this.ownersService.getOwners().subscribe(owners => {
        this.targets.set(owners);
      });
    } else if (this.isTrainer()) {
      this.trainerService.getAttendances().subscribe({
        next: (res: any) => {
          if (res && res.data) {
            const map = new Map<string, any>();
            res.data.forEach((a: any) => {
              if (a.member && !map.has(a.member.id_user)) {
                map.set(a.member.id_user, a.member);
              }
            });
            this.targets.set(Array.from(map.values()));
          }
        }
      });
    } else if (this.isOwner() || this.isReceptionist()) {
      const requests: any = {
        staff: this.staffService.getStaff(1, 100)
      };
      
      if (this.isOwner()) {
        requests['members'] = this.memberService.getMembers(1, 100);
      }

      forkJoin(requests).subscribe({
        next: (res: any) => {
          const combinedTargets: UserVm[] = [];
          
          if (res.staff && res.staff.data) {
            res.staff.data.forEach((s: any) => {
              if (s.user) {
                combinedTargets.push({
                   ...s.user,
                   role: s.role || 'staff'
                });
              }
            });
          }
          
          if (res.members && res.members.data) {
            res.members.data.forEach((m: any) => {
              if (m.member) {
                combinedTargets.push({
                  ...m.member,
                  role: 'member'
                });
              }
            });
          }
          
          this.targets.set(combinedTargets);
        }
      });
    }
  }

  onDispatch() {
    if (this.dispatchForm.invalid) return;
    
    this.isDispatching.set(true);
    const { recipientType, targetId, message } = this.dispatchForm.value;

    let finalTargets: UserVm[] = [];

    if (recipientType === 'all') {
      if (this.isSuperAdmin() || (this.isAdmin() && !this.isOwner())) {
        this.notificationService.sendToAllUsers(message!).subscribe({
          next: () => this.handleSuccess('Announcement broadcasted to all users.'),
          error: () => this.handleError('Failed to broadcast message.')
        });
        return;
      }
      // Owners and Trainers should only send to their specific targets
      finalTargets = this.targets();
    } else if (recipientType === 'staff') {
      finalTargets = this.targets().filter(t => t.role !== 'member');
    } else if (recipientType === 'members') {
      finalTargets = this.targets().filter(t => t.role === 'member');
    } else {
      // Single target
      this.notificationService.sendToUser(targetId!, message!).subscribe({
        next: () => this.handleSuccess('Direct message sent.'),
        error: () => this.handleError('Failed to send target message.')
      });
      return;
    }

    if (finalTargets.length === 0) {
      this.handleError('No recipients found in this group.');
      return;
    }

    let completed = 0;
    let errors = 0;
    finalTargets.forEach(t => {
      this.notificationService.sendToUser(t.id_user, message!).subscribe({
        next: () => {
          completed++;
          if (completed + errors === finalTargets.length) {
            this.handleSuccess(`Messages sent to ${completed} recipients.`);
          }
        },
        error: () => {
          errors++;
          if (completed + errors === finalTargets.length) {
            if (completed === 0) this.handleError('Failed to send messages.');
            else this.handleSuccess(`Messages sent with ${errors} errors.`);
          }
        }
      });
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
    this.dispatchForm.reset({ recipientType: 'all', targetId: '', message: '' });
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }
}
