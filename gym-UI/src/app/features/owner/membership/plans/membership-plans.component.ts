import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MembershipPlanService, MembershipPlan } from '../../services/membership-plan.service';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { GymService } from '../../../../core/services/gym.service';
import { AuthService } from '../../../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-membership-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, TranslateModule],
  templateUrl: './membership-plans.component.html',
  styleUrl: './membership-plans.component.scss'
})
export class MembershipPlansComponent implements OnInit {
  private planService = inject(MembershipPlanService);
  private gymService = inject(GymService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);

  plans = signal<MembershipPlan[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editingPlan = signal<MembershipPlan | null>(null);

  gymId: string = '';
  newFeature: string = '';

  currentPlan: MembershipPlan = this.resetPlan();

  canManage = computed(() => {
    const role = this.authService.userRole()?.toLowerCase();
    return role === 'owner';
  });

  ngOnInit() {
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
    this.newFeature = '';
    this.showModal.set(true);
  }

  openEditModal(plan: MembershipPlan) {
    this.editingPlan.set(plan);
    this.currentPlan = { ...plan, features: [...(plan.features ?? [])] };
    this.newFeature = '';
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  addFeature() {
    const trimmed = this.newFeature.trim();
    if (!trimmed) return;
    if (!this.currentPlan.features) this.currentPlan.features = [];
    if (!this.currentPlan.features.includes(trimmed)) {
      this.currentPlan.features = [...this.currentPlan.features, trimmed];
    }
    this.newFeature = '';
  }

  removeFeature(index: number) {
    this.currentPlan.features = (this.currentPlan.features ?? []).filter((_, i) => i !== index);
  }

  savePlan() {
    if (!this.currentPlan.name?.trim() ||
        this.currentPlan.price == null || this.currentPlan.price < 0 || this.currentPlan.price > 99999 ||
        this.currentPlan.duration_days == null || this.currentPlan.duration_days < 1 || this.currentPlan.duration_days > 3650) {
      return;
    }

    this.isSaving.set(true);
    if (this.editingPlan()) {
      this.planService.updatePlan(this.editingPlan()!.id!, this.currentPlan)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => { this.loadPlans(); this.closeModal(); }
        });
    } else {
      this.planService.createPlan(this.gymId, this.currentPlan)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => { this.loadPlans(); this.closeModal(); }
        });
    }
  }

  deletePlan(id: string) {
    if (confirm(this.t('MEMBERSHIP_PLANS.CONFIRM_DECOMMISSION'))) {
      this.planService.deletePlan(id).subscribe(() => this.loadPlans());
    }
  }

  getPlanTypeKey(type: string | undefined): string {
    switch ((type || '').toLowerCase()) {
      case 'trial':
        return 'MEMBERSHIP_PLANS.TYPE_TRIAL';
      case 'premium':
        return 'MEMBERSHIP_PLANS.TYPE_PREMIUM';
      case 'standard':
      default:
        return 'MEMBERSHIP_PLANS.TYPE_STANDARD';
    }
  }

  private resetPlan(): MembershipPlan {
    return {
      name: '',
      price: 0,
      duration_days: 30,
      description: '',
      type: 'standard',
      features: [],
    };
  }

  private t(key: string, params?: Record<string, unknown>): string {
    const translated = this.translate.instant(key, params);
    return typeof translated === 'string' ? translated : key;
  }
}
