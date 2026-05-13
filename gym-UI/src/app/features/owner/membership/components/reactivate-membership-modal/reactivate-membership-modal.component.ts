import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipPlanService, MembershipPlan } from '../../../services/membership-plan.service';
import { ReceptionistPaymentsService } from '../../../../receptionist/views/payments/receptionist-payments.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-reactivate-membership-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="close.emit()">
      <div class="modal-content glass-card animate-scale-up" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
          </div>
          <div class="header-text">
            <h2>Reactivate Membership</h2>
            <p>Select a plan for {{ membership().member?.name }} {{ membership().member?.last_name }}</p>
          </div>
          <button class="close-btn" (click)="close.emit()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </header>

        <div class="modal-body">
          @if (error()) {
            <div class="error-msg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ error() }}
            </div>
          }

          <div class="form-group">
            <label>Select Membership Plan</label>
            <div class="plans-grid">
              @if (isLoading()) {
                <div class="plans-loading">
                  <div class="spinner"></div>
                  <span>Loading available plans...</span>
                </div>
              } @else {
                @for (plan of plans(); track plan.id) {
                  <div class="plan-option" 
                       [class.selected]="selectedPlanId() === plan.id"
                       (click)="selectedPlanId.set(plan.id!)">
                    <div class="plan-header">
                      <span class="plan-name">{{ plan.name }}</span>
                      <span class="plan-type" [class]="plan.type">{{ plan.type }}</span>
                    </div>
                    <div class="plan-price">
                      {{ plan.price | number:'1.2-2' }} <span>TND</span>
                    </div>
                    <div class="plan-duration">
                      Duration: {{ plan.duration_days }} Days
                    </div>
                    @if (selectedPlanId() === plan.id) {
                      <div class="selection-indicator">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="cancel-btn" (click)="close.emit()" [disabled]="isSaving()">Cancel</button>
          <button class="confirm-btn" 
                  (click)="onSave()" 
                  [disabled]="!selectedPlanId() || isSaving()">
            {{ isSaving() ? 'Processing...' : 'Confirm Reactivation' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      padding: 1.5rem;
    }
    .modal-content {
      width: 100%; max-width: 600px;
      background: var(--bg-card); border: 1.5px solid var(--border-glass);
      border-radius: 28px; overflow: hidden; box-shadow: var(--shadow-xl);
    }
    .modal-header {
      padding: 1.75rem; border-bottom: 1px solid var(--border-color);
      display: flex; align-items: center; gap: 1.25rem; position: relative;

      .header-icon {
        width: 48px; height: 48px; border-radius: 14px;
        background: rgba(16, 185, 129, 0.1); color: #10b981;
        display: flex; align-items: center; justify-content: center;
      }
      .header-text {
        h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-main); }
        p { margin: 0.25rem 0 0; font-size: 0.9rem; color: var(--text-muted); }
      }
      .close-btn {
        position: absolute; top: 1.5rem; right: 1.5rem;
        background: transparent; border: none; color: var(--text-muted);
        cursor: pointer; transition: all 0.2s;
        &:hover { color: #ef4444; transform: rotate(90deg); }
      }
    }
    .modal-body { padding: 1.75rem; }
    .form-group {
      label { display: block; font-size: 0.85rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 1.25rem; }
    }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; max-height: 400px; overflow-y: auto; padding: 4px; }
    .plan-option {
      padding: 1.25rem; border-radius: 18px; border: 2px solid var(--border-color);
      background: var(--bg-hover); cursor: pointer; transition: all 0.2s ease;
      position: relative;

      &:hover { border-color: #10b981; transform: translateY(-2px); }
      &.selected { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }

      .plan-header {
        display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;
        .plan-name { font-weight: 800; color: var(--text-main); font-size: 1rem; }
        .plan-type { 
          font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 800; text-transform: uppercase;
          &.standard { background: rgba(100, 116, 139, 0.1); color: #64748b; }
          &.premium { background: rgba(245, 158, 11, 0.1); color: #d97706; }
          &.trial { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        }
      }
      .plan-price { 
        font-size: 1.25rem; font-weight: 900; color: #10b981; margin-bottom: 0.25rem;
        span { font-size: 0.75rem; opacity: 0.7; }
      }
      .plan-duration { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
      
      .selection-indicator {
        position: absolute; top: -8px; right: -8px;
        width: 24px; height: 24px; border-radius: 50%;
        background: #10b981; color: white;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
      }
    }
    .modal-footer {
      padding: 1.5rem 1.75rem; background: var(--bg-hover);
      display: flex; justify-content: flex-end; gap: 1rem;

      button { padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
      .cancel-btn { background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); &:hover { background: var(--bg-card); color: var(--text-main); } }
      .confirm-btn { 
        background: linear-gradient(135deg, #10b981, #059669); color: white; border: none;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }
    .error-msg {
      margin-bottom: 1.5rem; padding: 1rem; border-radius: 14px;
      background: rgba(239, 68, 68, 0.1); color: #ef4444;
      display: flex; align-items: center; gap: 0.75rem; font-weight: 700; font-size: 0.9rem;
    }
    .plans-loading {
      grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; color: var(--text-muted);
      .spinner { width: 24px; height: 24px; border: 3px solid rgba(0,0,0,0.1); border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class ReactivateMembershipModalComponent implements OnInit {
  membership = input.required<any>();
  close = output<void>();
  reactivated = output<void>();

  private planService = inject(MembershipPlanService);
  private paymentService = inject(ReceptionistPaymentsService);

  plans = signal<MembershipPlan[]>([]);
  selectedPlanId = signal<string>('');
  isLoading = signal(false);
  isSaving = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    const gymId = this.membership().id_gym || this.membership().gym?.id_gym;
    if (!gymId) {
      this.error.set('Gym information missing.');
      return;
    }

    this.isLoading.set(true);
    this.planService.getPlans(gymId).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res) => {
        this.plans.set(res.data || []);
        // Auto-select first plan if available
        if (res.data?.length > 0) {
          this.selectedPlanId.set(res.data[0].id);
        }
      },
      error: () => this.error.set('Failed to load plans.')
    });
  }

  onSave() {
    if (!this.selectedPlanId()) return;

    const plan = this.plans().find(p => p.id === this.selectedPlanId());
    if (!plan) return;

    this.isSaving.set(true);
    this.error.set(null);

    const payload = {
      member_id: this.membership().id_member || this.membership().member?.id_user,
      id_gym: this.membership().id_gym || this.membership().gym?.id_gym,
      amount: plan.price,
      gateway: 'cash',
      category: 'membership',
      id_plan: plan.id!,
      start_date: new Date().toISOString().split('T')[0]
    };

    this.paymentService.create(payload).pipe(
      finalize(() => this.isSaving.set(false))
    ).subscribe({
      next: () => {
        this.reactivated.emit();
        this.close.emit();
      },
      error: (err) => {
        console.error('Reactivation error:', err);
        this.error.set(err.error?.message || 'Reactivation failed. Please ensure all data is correct.');
      }
    });
  }
}
