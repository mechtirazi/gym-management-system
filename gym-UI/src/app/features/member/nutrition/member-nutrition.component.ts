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
  paymentError: string | null = null;
  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI'

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
      gyms: this.memberService.getAllGyms().pipe(catchError(() => of({ data: [] }))),
      subscriptions: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] })))
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
        const allGyms = extract(res.gyms);
        const mySubscriptions = extract(res.subscriptions);

        // Filter: Only show plans from gyms where the member has a subscription
        const subscribedGymIds = mySubscriptions.map((s: any) => s.id_gym || s.gym_id);
        
        // Update selection dropdown to only show subscribed gyms
        this.gyms = allGyms.filter((g: any) => subscribedGymIds.includes(g.id_gym));
        
        const filteredPlansRaw = plansRaw.filter((plan: any) => subscribedGymIds.includes(plan.id_gym));

        const myIds = myPlans.map((p: any) => p.id_nutrition_plan || p.id);

        this.nutritionPlans = Array.isArray(filteredPlansRaw) ? filteredPlansRaw.map((plan: any) => {
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
    this.selectedPlan = plan;
    this.showPaymentModal = true;
    this.paymentError = null;
    this.cdr.detectChanges();
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedPlan = null;
    this.cdr.detectChanges();
  }

  completePurchase(event: any) {
    if (!this.selectedPlan) return;

    const method = event.method;
    this.processingPayment = true;
    this.paymentError = null;

    if (method === 'zen_wallet') {
      this.memberService.purchaseNutritionPlan(this.selectedPlan.id_plan || this.selectedPlan.id).subscribe({
        next: (res: any) => this.handleSuccess(res),
        error: (err: any) => this.handleError(err)
      });
    } else {
        // Stripe flow for Nutrition
        this.memberService.createPaymentIntent(this.selectedPlan.id_gym, 19.99).subscribe({
          next: (res: any) => {
            event.stripe.confirmCardPayment(res.client_secret, {
              payment_method: { card: event.card }
            }).then((result: any) => {
              if (result.error) {
                this.handleError({ error: { message: result.error.message } });
              } else if (result.paymentIntent.status === 'succeeded') {
                this.memberService.purchaseNutritionPlan(this.selectedPlan.id_plan || this.selectedPlan.id).subscribe({
                  next: (res: any) => this.handleSuccess(res),
                  error: (err: any) => this.handleError(err)
                });
              }
            });
          },
          error: (err: any) => this.handleError(err)
        });
    }
  }

  private handleSuccess(res: any) {
    this.processingPayment = false;
    this.cdr.detectChanges();
    setTimeout(() => {
        this.closePaymentModal();
        this.loadAllNutritionData();
    }, 1500);
  }

  private handleError(err: any) {
    console.error('PURCHASE FAILURE:', err);
    this.paymentError = err.error?.message || 'Access synchronization failed.';
    this.processingPayment = false;
    this.cdr.detectChanges();
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
