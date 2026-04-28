import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
  templateUrl: './membership-plans.component.html',
  styleUrl: './membership-plans.component.scss'
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

  canManage = computed(() => {
    const role = this.authService.userRole()?.toLowerCase();
    return role === 'owner';
  });

  ngOnInit() {
    console.log('MembershipPlansComponent - Current Role:', this.authService.userRole());
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
