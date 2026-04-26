import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-membership-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="close.emit()">
      <div class="modal-container glass-card" (click)="$event.stopPropagation()">
        <!-- Header with background effect -->
        <div class="modal-banner">
          <div class="banner-overlay"></div>
          <button class="close-btn-floating" (click)="close.emit()">×</button>
        </div>

        <div class="modal-body">
          <div class="profile-section">
            <div class="avatar-wrapper">
              <div class="avatar-large">{{ (membership().member?.name || 'M').charAt(0) }}</div>
              <div class="status-badge" [class]="(membership().status || 'active').toLowerCase()">
                {{ membership().status || 'Active' }}
              </div>
            </div>
            
            <div class="member-primary-info">
              <h2>{{ membership().member?.name }} {{ membership().member?.last_name }}</h2>
              <p class="member-email">{{ membership().member?.email }}</p>
            </div>
          </div>

          <div class="details-section">
            <div class="detail-group">
              <h3>Plan Details</h3>
              <div class="details-grid">
                <div class="detail-card">
                  <span class="label">Membership Tier</span>
                  <span class="value tier-tag" [class]="membership().plan?.type || membership().type || 'standard'">
                    {{ (membership().plan?.name || membership().type || 'Standard') | titlecase }}
                  </span>
                </div>
                <div class="detail-card">
                  <span class="label">Assigned Gym</span>
                  <span class="value">{{ membership().gym?.name || 'Central Fitness Hub' }}</span>
                </div>
              </div>
            </div>

            <div class="detail-group">
              <h3>Enrollment Timeline</h3>
              <div class="details-grid">
                <div class="detail-card">
                  <span class="label">Activation Date</span>
                  <span class="value">{{ (membership().enrollment_date || membership().created_at) | date:'MMMM d, y' }}</span>
                </div>
                <div class="detail-card">
                  <span class="label">Expiry Date</span>
                  <span class="value">{{ membership().expiry_date ? (membership().expiry_date | date:'MMMM d, y') : 'Auto-renewing' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="footer-btn action-edit" (click)="$event.stopPropagation(); close.emit()">Done</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px) saturate(180%);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
    }
    
    .modal-container {
      width: 100%; max-width: 520px; background: var(--bg-card, #ffffff);
      border-radius: 40px; overflow: hidden; position: relative;
      box-shadow: 0 40px 120px -20px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.4);
      animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-banner {
      height: 120px; 
      background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
      position: relative;
    }

    .close-btn-floating {
      position: absolute; top: 1.5rem; right: 1.5rem;
      width: 36px; height: 36px; border-radius: 12px;
      background: rgba(255, 255, 255, 0.2); border: none;
      color: white; font-size: 1.5rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.25s;
      &:hover { background: rgba(255, 255, 255, 0.3); transform: rotate(90deg); }
    }

    .modal-body { padding: 0 2.5rem 2.5rem; margin-top: -60px; }

    .profile-section {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      margin-bottom: 2.5rem;
    }

    .avatar-wrapper {
      position: relative; margin-bottom: 1.5rem;
      .avatar-large {
        width: 110px; height: 110px; background: white; color: #0ea5e9;
        border-radius: 36px; display: flex; align-items: center; justify-content: center;
        font-size: 3rem; font-weight: 900;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        border: 5px solid white;
      }
      .status-badge {
        position: absolute; bottom: 0; right: -5px;
        padding: 0.4rem 1rem; border-radius: 12px; font-size: 0.75rem; 
        font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        &.active { background: #10b981; color: white; }
        &.expired { background: #ef4444; color: white; }
      }
    }

    .member-primary-info {
      h2 { font-size: 2rem; font-weight: 900; color: var(--text-main, #0f172a); margin: 0 0 0.25rem 0; letter-spacing: -0.04em; }
      .member-email { color: var(--text-muted, #64748b); font-weight: 600; font-size: 1rem; }
    }

    .details-section { display: flex; flex-direction: column; gap: 2rem; }
    .detail-group {
      h3 { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 1rem; }
    }

    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .detail-card {
      padding: 1.25rem; background: var(--bg-hover, #f8fafc); border-radius: 24px;
      border: 1.5px solid var(--border-color, #e2e8f0);
      .label { display: block; font-size: 0.75rem; color: var(--text-muted); font-weight: 700; margin-bottom: 0.5rem; text-transform: capitalize; }
      .value { font-weight: 700; color: var(--text-main); font-size: 0.95rem; }
      .tier-tag {
        display: inline-block; padding: 0.2rem 0.6rem; border-radius: 8px; font-size: 0.8rem;
        &.standard { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; }
        &.premium { background: rgba(245, 158, 11, 0.1); color: #d97706; }
      }
    }

    .modal-footer { padding: 0 2.5rem 2.5rem; }
    .footer-btn {
      width: 100%; padding: 1.1rem; border-radius: 18px; border: none;
      background: var(--bg-main, #f1f5f9); color: var(--text-main, #0f172a);
      font-weight: 800; font-size: 1rem; cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      &:hover { background: var(--border-color); transform: translateY(-2px); }
    }

    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ViewMembershipModalComponent {
  membership = input.required<any>();
  close = output<void>();
}
