import { Component, output, signal, inject, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { finalize, Subscription } from 'rxjs';
import { MembershipPlanService, MembershipPlan } from '../../../services/membership-plan.service';

@Component({
  selector: 'app-edit-membership-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="close.emit()">
      <div class="modal-container glass-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-icon">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div class="header-text">
            <h2>Refine Membership</h2>
            <p>Update subscription details for {{ membership()?.member?.name }}</p>
          </div>
          <button class="close-btn" (click)="close.emit()">×</button>
        </div>

        <form [formGroup]="editForm" (ngSubmit)="onSubmit()" class="modal-body">
          @if (error()) {
            <div class="error-alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ error() }}
            </div>
          }

          <div class="form-grid">
            <div class="form-group" style="grid-column: span 2;">
              <label>Enrollment Date</label>
              <input type="date" formControlName="enrollment_date" style="width: 100%; padding: 0.9rem 1.1rem; border-radius: 14px; background: #f8fafc; border: 2px solid #e2e8f0; font-size: 0.95rem; font-weight: 700; color: #1e293b; transition: all 0.2s;">
            </div>

            <div class="form-group">
              <label>Plan Status</label>
              <select formControlName="status">
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div class="form-group">
              <label>Membership Tier</label>
              <select formControlName="id_plan">
                <option value="">Legacy (Select new plan)</option>
                @for (plan of plans(); track plan.id) {
                  <option [value]="plan.id">{{ plan.name }} - {{ plan.type | titlecase }}</option>
                }
              </select>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="close.emit()">Discard</button>
            <button type="submit" class="btn-primary" [disabled]="editForm.invalid || isSubmitting()">
              @if (isSubmitting()) {
                <span class="spinner"></span>
              } @else {
                Save Enhancements
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px) saturate(160%);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
    }
    
    .modal-container {
      width: 100%; max-width: 480px; background: white; border-radius: 36px;
      overflow: hidden; box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.5);
      animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .modal-header {
      padding: 2rem 2rem 1.5rem; display: flex; align-items: center; gap: 1.25rem;
      position: relative;
      .header-icon {
        width: 48px; height: 48px; background: rgba(14, 165, 233, 0.1);
        color: #0ea5e9; border-radius: 16px; display: flex;
        align-items: center; justify-content: center;
      }
      .header-text {
        h2 { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin: 0 0 0.2rem 0; letter-spacing: -0.03em; }
        p { font-size: 0.85rem; color: #64748b; font-weight: 600; }
      }
      .close-btn {
        position: absolute; top: 1.5rem; right: 1.5rem;
        background: none; border: none; font-size: 1.8rem; color: #94a3b8;
        cursor: pointer; &:hover { color: #ef4444; }
      }
    }

    .modal-body { padding: 0 2rem 2rem; }

    .error-alert {
      background: #fef2f2; color: #dc2626; padding: 1rem; border-radius: 16px;
      margin-bottom: 1.5rem; font-size: 0.85rem; font-weight: 700;
      display: flex; align-items: center; gap: 0.75rem;
      border: 1px solid #fee2e2;
    }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem; }
    
    .form-group {
      display: flex; flex-direction: column; gap: 0.5rem;
      label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-left: 0.25rem; }
      select {
        width: 100%; padding: 0.9rem 1.1rem; border-radius: 14px;
        background: #f8fafc; border: 2px solid #e2e8f0;
        font-size: 0.95rem; font-weight: 700; color: #1e293b;
        transition: all 0.2s;
        &:focus { outline: none; border-color: #0ea5e9; background: white; box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1); }
      }
    }

    .modal-footer {
      display: flex; gap: 1rem;
      button { flex: 1; padding: 1rem; border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
      .btn-secondary { background: #f1f5f9; color: #64748b; border: none; &:hover { background: #e2e8f0; } }
      .btn-primary { 
        background: #0ea5e9; color: white; border: none; 
        box-shadow: 0 8px 20px rgba(14, 165, 233, 0.3);
        &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(14, 165, 233, 0.4); }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
      }
    }

    .spinner {
      width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; display: inline-block;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes modalPop { 
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class EditMembershipModalComponent implements OnInit {
  private membershipService = inject(MembershipService);
  private fb = inject(FormBuilder);

  membership = input.required<any>();
  close = output<void>();
  updated = output<void>();

  isSubmitting = signal(false);
  error = signal<string | null>(null);
  plans = signal<MembershipPlan[]>([]);
  private planService = inject(MembershipPlanService);
  private authService = inject(AuthService);

  editForm = this.fb.group({
    enrollment_date: ['', Validators.required],
    status: ['', Validators.required],
    id_plan: ['']
  });

  private statusSub?: Subscription;

  ngOnInit() {
    let rawDate = this.membership().enrollment_date || this.membership().created_at || new Date();
    // Format to yyyy-mm-dd for date input
    const d = new Date(rawDate);
    const dateString = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';

    this.editForm.patchValue({
      enrollment_date: dateString,
      status: (this.membership().status || 'active').toLowerCase(),
      id_plan: this.membership().id_plan || ''
    });

    const gymId = this.authService.connectedGymId();
    if (gymId) {
      this.planService.getPlans(gymId.toString()).subscribe({
        next: (res) => {
          this.plans.set(res.data || res || []);
        },
        error: (err) => console.error('Failed to load plans', err)
      });
    }

    this.statusSub = this.editForm.get('status')?.valueChanges.subscribe(newStatus => {
      if (newStatus === 'active') {
        const today = new Date().toISOString().split('T')[0];
        this.editForm.patchValue({ enrollment_date: today });
      }
    });
  }

  ngOnDestroy() {
    if (this.statusSub) {
      this.statusSub.unsubscribe();
    }
  }

  onSubmit() {
    if (this.editForm.invalid) return;

    this.isSubmitting.set(true);
    const gymId = this.authService.connectedGymId();
    const id = this.membership().id_enrollment || this.membership().id_subscribe || this.membership().id;

    const payload = {
      ...this.editForm.value,
      id_gym: gymId
    };

    this.membershipService.updateMembership(id, payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.updated.emit();
          this.close.emit();
        },
        error: (err: any) => this.error.set(err.error?.message || 'Update failed')
      });
  }
}
