import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-member-nutrition',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
  templateUrl: './member-nutrition.component.html',
  styleUrl: './member-nutrition.component.scss'
})
export class MemberNutritionComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  nutritionPlans: any[] = [];
  gyms: any[] = [];
  loading = true;
  errorMessage = '';

  // Filtering and Search State
  searchText = '';
  selectedGymId = 'all';

  // Pagination State
  currentPage = 1;
  pageSize = 6;

  // Payment System State
  showPaymentModal = false;
  selectedPlan: any = null;
  processingPayment = false;

  get filteredNutritionPlans() {
    return this.nutritionPlans.filter(plan => {
      const matchesSearch = !this.searchText ||
        plan.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        plan.description?.toLowerCase().includes(this.searchText.toLowerCase());
      const matchesGym = this.selectedGymId === 'all' || plan.id_gym == this.selectedGymId;
      return matchesSearch && matchesGym;
    });
  }

  get paginatedPlans() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredNutritionPlans.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredNutritionPlans.length / this.pageSize);
  }

  ngOnInit(): void {
    this.loadAllNutritionData();
  }

  loadAllNutritionData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      allPlans: this.memberService.getMyNutritionPlansMarketplace().pipe(catchError((err) => {
        console.error('Marketplace Sync Fail:', err);
        return of({ data: [] });
      })),
      myPlans: this.memberService.getMyNutritionPlans().pipe(catchError((err) => {
        console.error('Subscription Sync Fail:', err);
        return of({ data: [] });
      })),
      gyms: this.memberService.getAllGyms().pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (res: any) => {
        const extract = (obj: any): any[] => {
          if (!obj) return [];
          if (Array.isArray(obj)) return obj;
          if (Array.isArray(obj.data)) return obj.data;
          if (obj.data && Array.isArray(obj.data.data)) return obj.data.data;
          if (obj.plans && Array.isArray(obj.plans)) return obj.plans;
          return [];
        };

        const plansRaw = extract(res.allPlans);
        const myPlans = extract(res.myPlans);
        this.gyms = extract(res.gyms);

        const myIds = myPlans.map((p: any) => p.id_nutrition_plan || p.id);

        this.nutritionPlans = Array.isArray(plansRaw) ? plansRaw.map((plan: any) => {
          const gym = this.gyms.find((g: any) => g.id_gym === plan.id_gym);
          return {
            ...plan,
            isOwned: myIds.includes(plan.id_nutrition_plan || plan.id),
            isActive: plan.is_active !== undefined ? !!plan.is_active : true,
            gymName: gym?.name || 'Unknown Hub',
            gymLogo: gym?.logo || (gym?.name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(gym.name)}&background=1e293b&color=10b981&bold=true` : 'https://ui-avatars.com/api/?name=Hub&background=1e293b&color=10b981&bold=true'),
            macroStatus: this.calculateMacros(plan)
          };
        }) : [];

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fatal Hub Synchronization Failure', err);
        this.errorMessage = 'Backend connection failed. Check your API Hub.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  buyPlan(plan: any) {
    // Condition removed for testing purposes as per user request
    this.selectedPlan = plan;
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedPlan = null;
    this.cdr.detectChanges();
  }

  completePurchase() {
    if (!this.selectedPlan) return;

    this.processingPayment = true;
    const planId = this.selectedPlan.id_plan || this.selectedPlan.id;

    this.memberService.purchaseNutritionPlan(planId).subscribe({
      next: (response) => {
        console.log('PURCHASE SUCCESS:', response);
        this.processingPayment = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.closePaymentModal();
          this.loadAllNutritionData();
        }, 1500);
      },
      error: (err) => {
        console.error('PURCHASE FAILURE:', err);
        this.processingPayment = false;
        alert('Payment failed: ' + (err.error?.message || 'Gateway Error'));
        this.closePaymentModal();
      }
    });
  }

  calculateMacros(plan: any) {
    const p = plan.protein || 0;
    const c = plan.carbs || 0;
    const f = plan.fats || 0;

    // Dynamic calorie calculation based on exact macro multipliers
    let calories = (p * 4) + (c * 4) + (f * 9);
    if (!calories) {
      calories = plan.calories || 0;
    }

    return {
      protein: p,
      carbs: c,
      fats: f,
      calories: calories,
      pPercent: calories > 0 ? ((p * 4) / calories) * 100 : 0,
      cPercent: calories > 0 ? ((c * 4) / calories) * 100 : 0,
      fPercent: calories > 0 ? ((f * 9) / calories) * 100 : 0,
      score: plan.score || 0
    };
  }
}
