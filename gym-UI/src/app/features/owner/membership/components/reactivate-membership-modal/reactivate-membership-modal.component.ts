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

          <div class="form-group date-selection">
            <label>Activation / Enrollment Date</label>
            <div class="date-input-wrapper">
              <span class="material-symbols-rounded">calendar_today</span>
              <input type="date" [(ngModel)]="enrollmentDate" [min]="today">
            </div>
            <p class="field-hint">When should this membership period begin?</p>
          </div>

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
      width: 100%; max-width: 650px;
      background: var(--bg-card); border: 1.5px solid var(--border-glass);
      border-radius: 32px; overflow: hidden; box-shadow: var(--shadow-xl);
    }
    .modal-header {
      padding: 2rem; border-bottom: 1px solid var(--border-color);
      display: flex; align-items: center; gap: 1.25rem; position: relative;

      .header-icon {
        width: 52px; height: 52px; border-radius: 16px;
        background: rgba(16, 185, 129, 0.1); color: #10b981;
        display: flex; align-items: center; justify-content: center;
      }
      .header-text {
        h2 { margin: 0; font-size: 1.35rem; font-weight: 850; color: var(--text-main); letter-spacing: -0.02em; }
        p { margin: 0.35rem 0 0; font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
      }
      .close-btn {
        position: absolute; top: 1.5rem; right: 1.5rem;
        background: transparent; border: none; color: var(--text-muted);
        cursor: pointer; transition: all 0.2s;
        &:hover { color: #ef4444; transform: rotate(90deg); }
      }
    }
    .modal-body { padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }
    .form-group {
      label { display: block; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 1rem; letter-spacing: 0.05em; }
      
      &.date-selection {
        background: var(--bg-hover);
        padding: 1.5rem;
        border-radius: 20px;
        border: 1px solid var(--border-color);

        .date-input-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--bg-card);
          padding: 0.85rem 1.25rem;
          border-radius: 14px;
          border: 1.5px solid var(--border-color);
          transition: all 0.2s;

          &:focus-within { border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }

          span { color: #10b981; font-size: 20px; }
          input { 
            background: transparent; border: none; color: var(--text-main); 
            font-weight: 700; font-size: 1rem; outline: none; flex: 1; 
            &::-webkit-calendar-picker-indicator { cursor: pointer; filter: var(--calendar-icon-filter); }
          }
        }
        .field-hint { margin: 0.75rem 0 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
      }
    }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; max-height: 350px; overflow-y: auto; padding: 4px; }
    .plan-option {
      padding: 1.5rem; border-radius: 20px; border: 2px solid var(--border-color);
      background: var(--bg-card); cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;

      &:hover { border-color: #10b981; transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.05); }
      &.selected { border-color: #10b981; background: rgba(16, 185, 129, 0.04); }

      .plan-header {
        display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;
        .plan-name { font-weight: 850; color: var(--text-main); font-size: 1.05rem; }
        .plan-type { 
          font-size: 0.6rem; padding: 0.25rem 0.6rem; border-radius: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
          &.standard { background: rgba(100, 116, 139, 0.1); color: #64748b; }
          &.premium { background: rgba(245, 158, 11, 0.15); color: #d97706; }
          &.trial { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
        }
      }
      .plan-price { 
        font-size: 1.5rem; font-weight: 950; color: #10b981; margin-bottom: 0.5rem; letter-spacing: -0.04em;
        span { font-size: 0.8rem; opacity: 0.7; font-weight: 800; }
      }
      .plan-duration { font-size: 0.85rem; color: var(--text-muted); font-weight: 700; }
      
      .selection-indicator {
        position: absolute; top: -10px; right: -10px;
        width: 28px; height: 28px; border-radius: 50%;
        background: #10b981; color: white;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4);
        svg { width: 18px; height: 18px; }
      }
    }
    .modal-footer {
      padding: 1.75rem 2rem; background: var(--bg-hover);
      display: flex; justify-content: flex-end; gap: 1.25rem; border-top: 1px solid var(--border-color);

      button { padding: 0.9rem 1.75rem; border-radius: 14px; font-weight: 850; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; border: none; }
      .cancel-btn { background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); &:hover { background: var(--bg-card); color: var(--text-main); } }
      .confirm-btn { 
        background: linear-gradient(135deg, #10b981, #059669); color: white;
        box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25);
        &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(16, 185, 129, 0.35); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }
    .error-msg {
      padding: 1.25rem; border-radius: 16px;
      background: rgba(239, 68, 68, 0.1); color: #ef4444;
      display: flex; align-items: center; gap: 1rem; font-weight: 750; font-size: 0.95rem;
    }
    .plans-loading {
      grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem; color: var(--text-muted);
      .spinner { width: 32px; height: 32px; border: 4px solid rgba(0,0,0,0.1); border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
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
  enrollmentDate = new Date().toISOString().split('T')[0];
  today = new Date().toISOString().split('T')[0];
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
      start_date: this.enrollmentDate
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
