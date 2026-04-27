import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffInvitation } from '../../notifications.model';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-staff-invitations',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
  template: `
    <div class="invitations-section" *ngIf="invitations.length > 0">
      <div class="section-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="19" y2="14"></line>
          <line x1="22" y1="11" x2="16" y2="11"></line>
        </svg>
        <h2>Staff Invitations</h2>
        <div class="count-badge pulse">{{ invitations.length }}</div>
      </div>

      <div class="invitations-list">
        @for (invite of invitations; track invite.id_notification) {
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
              <button class="accept-btn" (click)="onAccept.emit(invite)">Accept</button>
              <button class="reject-btn" (click)="onReject.emit(invite.id_notification)">Decline</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .section-badge {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
      margin-bottom: 1rem;

      h2 {
        font-size: 1rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--admin-text-primary);
        margin: 0;
      }
    }

    .count-badge {
      padding: 0.25rem 0.6rem;
      background: var(--admin-accent-indigo);
      color: white;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 800;
      
      &.pulse {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
        animation: pulse 2s infinite;
      }
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
      100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffInvitationsComponent {
  @Input() invitations: StaffInvitation[] = [];
  
  @Output() onAccept = new EventEmitter<StaffInvitation>();
  @Output() onReject = new EventEmitter<string>();
}
