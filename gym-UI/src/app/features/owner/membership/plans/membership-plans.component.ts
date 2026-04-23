import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipPlanService, MembershipPlan } from '../../services/membership-plan.service';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { GymService } from '../../../../core/services/gym.service';
import { AuthService } from '../../../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-membership-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="plans-container animate-fade-in">
      <app-page-header 
        title="Protocol Pricing" 
        subtitle="Manage your gym's enrollment tiers and synchronization prices."
        buttonText="Add New Tier" 
        (addClick)="openAddModal()">
        
        <div header-icon>
          <span class="material-symbols-rounded">price_check</span>
        </div>
      </app-page-header>

      <main class="plans-content">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="sync-spinner"></div>
            <p>Accessing pricing nodes...</p>
          </div>
        } @else if (plans().length === 0) {
          <div class="empty-state">
            <span class="material-symbols-rounded icon-lg">receipt_long</span>
            <h3>No pricing tiers defined</h3>
            <p>Set up your first membership plan to allow member enrollment.</p>
            <button class="btn-primary-glow" (click)="openAddModal()">Initialize Plans</button>
          </div>
        } @else {
          <div class="plans-grid">
            @for (plan of plans(); track plan.id) {
              <div class="plan-card" [class.premium]="plan.type === 'premium'">
                <div class="card-glow"></div>
                <div class="tier-badge" [class]="plan.type">{{ plan.type | uppercase }}</div>
                
                <div class="plan-header">
                  <h3>{{ plan.name }}</h3>
                  <div class="price-tag">
                    <span class="currency">$</span>
                    <span class="amount">{{ plan.price }}</span>
                  </div>
                </div>

                <div class="plan-details">
                  <div class="detail-item">
                    <span class="material-symbols-rounded">schedule</span>
                    <span>{{ plan.duration_days }} Days Access</span>
                  </div>
                  <p class="plan-desc">{{ plan.description || 'Verified facility synchronization protocol.' }}</p>
                </div>

                <div class="plan-actions">
                  <button class="btn-icon edit" (click)="openEditModal(plan)">
                    <span class="material-symbols-rounded">edit_note</span>
                  </button>
                  <button class="btn-icon delete" (click)="deletePlan(plan.id!)">
                    <span class="material-symbols-rounded">delete_forever</span>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </main>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingPlan() ? 'Retune Protocol' : 'New Tier Setup' }}</h2>
              <button class="btn-close" (click)="closeModal()">
                <span class="material-symbols-rounded">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group">
                  <label>Tier Name</label>
                  <input type="text" [(ngModel)]="currentPlan.name" placeholder="e.g. Discovery Pass">
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Amount ($)</label>
                    <input type="number" [(ngModel)]="currentPlan.price" placeholder="0.00">
                  </div>
                  <div class="form-group">
                    <label>Duration (Days)</label>
                    <input type="number" [(ngModel)]="currentPlan.duration_days" placeholder="30">
                  </div>
                </div>

                <div class="form-group">
                  <label>Service Type</label>
                  <select [(ngModel)]="currentPlan.type">
                    <option value="trial">Trial (Discovery)</option>
                    <option value="standard">Standard (Vanguard)</option>
                    <option value="premium">Premium (Elite)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Mission Description</label>
                  <textarea [(ngModel)]="currentPlan.description" rows="3" placeholder="Explain the perks of this tier..."></textarea>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">Abort</button>
              <button class="btn-primary-glow" [disabled]="isSaving()" (click)="savePlan()">
                {{ isSaving() ? 'Syncing...' : (editingPlan() ? 'Update Tier' : 'Establish Tier') }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .plans-container {
      padding: 1.5rem;
      color: #e2e8f0;
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .plan-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 2rem;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
    }

    .plan-card:hover {
      transform: translateY(-8px);
      border-color: rgba(16, 185, 129, 0.5);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5);
    }

    .plan-card.premium {
      border-color: rgba(139, 92, 246, 0.3);
    }

    .plan-card.premium:hover {
      border-color: rgba(139, 92, 246, 0.6);
    }

    .card-glow {
      position: absolute;
      top: 0; right: 0;
      width: 100px; height: 100px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .tier-badge {
      position: absolute;
      top: 1.5rem;
      right: -2rem;
      transform: rotate(45deg);
      width: 120px;
      text-align: center;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 4px 0;
      background: #475569;
      color: #fff;
    }

    .tier-badge.trial { background: #64748b; }
    .tier-badge.standard { background: #10b981; }
    .tier-badge.premium { background: #8b5cf6; }

    .plan-header h3 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #fff;
    }

    .price-tag {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 1.5rem;
    }

    .price-tag .currency { font-size: 1.2rem; color: #10b981; font-weight: 600; }
    .price-tag .amount { font-size: 2.5rem; font-weight: 800; color: #fff; }

    .plan-details {
      flex-grow: 1;
      margin-bottom: 2rem;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 1rem;
      color: #10b981;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .plan-desc {
      color: #94a3b8;
      line-height: 1.6;
      font-size: 0.9rem;
    }

    .plan-actions {
      display: flex;
      gap: 12px;
    }

    .btn-icon {
      flex: 1;
      height: 48px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-icon.edit:hover { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .btn-icon.delete:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    /* Modal Styling */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      width: 100%;
      max-width: 500px;
      overflow: hidden;
      animation: modalSlide 0.4s ease-out;
    }

    @keyframes modalSlide {
      from { transform: translateY(40px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-body { padding: 2rem; }

    .form-group { margin-bottom: 1.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    label { display: block; font-size: 0.8rem; color: #10b981; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; }
    
    input, select, textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px 16px;
      color: #fff;
      outline: none;
      transition: all 0.3s;
    }

    input:focus, select:focus, textarea:focus {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    }

    .modal-footer {
      padding: 1.5rem 2rem;
      background: rgba(255, 255, 255, 0.02);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-secondary {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary-glow {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .sync-spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(16, 185, 129, 0.1);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: rgba(30, 41, 59, 0.3);
      border-radius: 24px;
      margin-top: 2rem;
    }

    .icon-lg { font-size: 4rem; color: #475569; margin-bottom: 1.5rem; }
  `]
})
export class MembershipPlansComponent implements OnInit {
  private planService = inject(MembershipPlanService);
  private gymService = inject(GymService);
  private authService = inject(AuthService);

  plans = signal<MembershipPlan[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editingPlan = signal<MembershipPlan | null>(null);

  gymId: string = '';

  currentPlan: MembershipPlan = this.resetPlan();

  ngOnInit() {
    // Reactively load plans when the gym context changes
    const gymId = this.authService.connectedGymId();
    if (gymId) {
      this.gymId = gymId.toString();
      this.loadPlans();
    }
  }

  loadPlans() {
    this.isLoading.set(true);
    this.planService.getPlans(this.gymId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.plans.set(res.data),
        error: (err) => console.error('Failed to load plans', err)
      });
  }

  openAddModal() {
    this.editingPlan.set(null);
    this.currentPlan = this.resetPlan();
    this.showModal.set(true);
  }

  openEditModal(plan: MembershipPlan) {
    this.editingPlan.set(plan);
    this.currentPlan = { ...plan };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  savePlan() {
    if (!this.currentPlan.name || this.currentPlan.price == null || this.currentPlan.price < 0) return;

    this.isSaving.set(true);
    if (this.editingPlan()) {
      this.planService.updatePlan(this.editingPlan()!.id!, this.currentPlan)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.loadPlans();
            this.closeModal();
          }
        });
    } else {
      this.planService.createPlan(this.gymId, this.currentPlan)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.loadPlans();
            this.closeModal();
          }
        });
    }
  }

  deletePlan(id: string) {
    if (confirm('Decommission this pricing tier?')) {
      this.planService.deletePlan(id).subscribe(() => this.loadPlans());
    }
  }

  private resetPlan(): MembershipPlan {
    return {
      name: '',
      price: 0,
      duration_days: 30,
      description: '',
      type: 'standard'
    };
  }
}
