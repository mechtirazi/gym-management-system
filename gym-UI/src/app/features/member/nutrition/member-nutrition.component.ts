import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';
import { PageHeaderComponent } from '../../owner/components/page-header/page-header.component';

import { NutritionMessagesComponent } from '../../nutritionist/utils/nutrition-messages.component';

@Component({
  selector: 'app-member-nutrition',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaymentModalComponent,
    PageHeaderComponent,
    NutritionMessagesComponent
  ],
  templateUrl: './member-nutrition.component.html',
  styleUrl: './member-nutrition.component.scss'
})
export class MemberNutritionComponent implements OnInit {
  private memberService = inject(MemberService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  nutritionPlans: any[] = [];
  ownedPlans: any[] = [];
  gyms: any[] = [];
  loading = true;
  errorMessage = '';

  // Filtering and Search State
  searchText = '';
  selectedGymId = 'all';

  // Messenger State
  showMessenger = false;

  // Pagination State
  currentPage = 1;
  pageSize = 6;

  // Professional Advisory Modal State
  showAdvisoryModal = false;

  // Payment System State
  showPaymentModal = false;
  selectedPlan: any = null;
  processingPayment = false;
  paymentError: string | null = null;
  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI'

  // Hub Logic State
  activeTab: 'insights' | 'shop' = 'insights';
  activePlan: any = null;
  nutritionistInsight = {
    expert: 'Specialist',
    expertId: '',
    role: 'Nutrition Advisor',
    message: 'Analyzing your metabolic progress...',
    timestamp: 'Real-time Sync',
    image: ''
  };

  analyzedBiometrics: any = null;

  // --- POWERFUL REAL-TIME BIO-SYNC STATE ---
  waterIntake = 7.77;
  waterGoal = 3500;
  dailyMeals: any[] = [];
  supplementStack: any[] = [];
  showPlanDetails = false;
  shoppingIngredients: any[] = [];

  get activeRecipientId(): string {
    return this.extractNutritionistId(this.activePlan) || String(this.nutritionistInsight.expertId || '').trim();
  }

  get waterPercentage(): number {
    return Math.min((this.waterIntake / (this.waterGoal || 2500)) * 100, 100);
  }

  addWater(amount: number) {
    console.log('Hydration Pulse: Adding', amount, 'ml. Current:', this.waterIntake);
    // Optimistic Update: Instant visual feedback before server sync
    const previousIntake = this.waterIntake;
    this.waterIntake += amount;
    this.cdr.detectChanges();

    this.memberService.logHydration(amount).subscribe({
      next: (res: any) => {
        console.log('Hydration Sync Success. Server Total:', res.total_today);
        // Sync with absolute server value
        this.waterIntake = res.total_today || this.waterIntake;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Hydration Sync Error:', err);
        // Rollback on sync failure
        this.waterIntake = previousIntake;
        this.cdr.detectChanges();
      }
    });
  }

  setTab(tab: 'insights' | 'shop') {
    this.activeTab = tab;
    if (tab === 'shop') this.currentPage = 1;
    this.cdr.detectChanges();
  }

  switchProtocol(plan: any) {
    this.activePlan = plan;
    this.syncNutritionistFromPlan(plan);
    this.loadActivePlanDetails(plan.id_plan || plan.id);
    this.cdr.detectChanges();
  }

  loadActivePlanDetails(planId: string) {
    this.memberService.getNutritionPlanDetails(planId).subscribe({
      next: (res: any) => {
        const planData = res.data;
        this.dailyMeals = planData.meals || [];
        this.supplementStack = planData.supplements || [];
        
        // Dynamic synchronization of the nutritionist who authored this plan
        if (planData.nutritionist || planData.id_nutritionist) {
          this.syncNutritionistFromPlan(planData);
        }

        this.shoppingIngredients = this.generateShoppingList(this.dailyMeals);
        this.cdr.detectChanges();
      }
    });
  }

  generateShoppingList(meals: any[]) {
    if (!meals || meals.length === 0) return [];

    // Group ingredients by their type if they exist, otherwise use meal names as fallback
    const list: any[] = [];
    const mainIngredients = meals.map(m => m.name.split(' ')[0]);

    if (mainIngredients.length > 0) {
      list.push({
        category: 'Main Ingredients',
        items: [...new Set(mainIngredients)]
      });
    }

    return list;
  }

  private extractNutritionistId(plan: any): string {
    const id = plan?.nutritionist?.id_user ||
      plan?.nutritionist?.id ||
      plan?.id_nutritionist;
    return String(id ?? '').trim();
  }

  private syncNutritionistFromPlan(plan: any) {
    if (!plan) return;

    const nutritionist = plan.nutritionist;
    const expertId = this.extractNutritionistId(plan);
    if (!expertId) return;

    this.nutritionistInsight.expert = nutritionist
      ? `${nutritionist.name || 'Specialist'} ${nutritionist.last_name || ''}`.trim()
      : this.nutritionistInsight.expert;
    this.nutritionistInsight.expertId = expertId;
    this.nutritionistInsight.role = nutritionist ? 'Official Specialist' : 'Scientific Advisor';
    this.nutritionistInsight.image = nutritionist?.profile_picture || this.nutritionistInsight.image;
  }

  getAvatarUrl(path?: string): string {
    return this.authService.getAvatarUrl(path);
  }

  bridgeContact() {
    const nutritionistId = this.activeRecipientId;
    if (!nutritionistId) {
      console.warn('Chat trigger failed: Missing nutritionist ID');
      (window as any).alert('Chat is unavailable. No nutritionist is assigned to your active plan yet.');
      return;
    }

    this.showMessenger = true;
    this.cdr.detectChanges();
  }

  viewExpertRemarks() {
    this.showAdvisoryModal = true;
    this.cdr.detectChanges();
  }

  closeAdvisory() {
    this.showAdvisoryModal = false;
    this.cdr.detectChanges();
  }

  viewActiveDetails() {
    if (this.activePlan) {
      this.showPlanDetails = true;
      this.cdr.detectChanges();
    }
  }

  resetWater() {
    this.waterIntake = 0;
    this.cdr.detectChanges();
  }

  // Meal Adherence Sync
  toggleMeal(meal: any) {
    const newState = !meal.is_completed;
    this.memberService.toggleMealCompletion(meal.id_meal, newState).subscribe({
      next: () => {
        meal.is_completed = newState;
        this.cdr.detectChanges();
      }
    });
  }

  get adherenceRate() {
    if (!this.dailyMeals?.length) return 0;
    const completed = this.dailyMeals.filter(m => m.is_completed).length;
    return Math.round((completed / this.dailyMeals.length) * 100);
  }

  closePlanDetails() {
    this.showPlanDetails = false;
    this.cdr.detectChanges();
  }

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
    console.log('MemberNutritionComponent: Bio-Pulse Initialized. Current Water:', this.waterIntake);
    this.loadAllNutritionData();
  }

  loadAllNutritionData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      allPlans: this.memberService.getMyNutritionPlansMarketplace(),
      myPlans: this.memberService.getMyNutritionPlans(),
      gyms: this.memberService.getAllGyms(),
      subscriptions: this.memberService.getMySubscriptions(),
      stats: this.memberService.getDashboardStats(),
      profile: of(this.authService.currentUser())
    }).subscribe({
      next: (res: any) => {
        const user = res.profile;
        const extract = (obj: any): any[] => {
          if (!obj) return [];
          if (Array.isArray(obj)) return obj;
          if (Array.isArray(obj.data)) return obj.data;
          if (obj.data && Array.isArray(obj.data.data)) return obj.data.data;
          if (obj.plans && Array.isArray(obj.plans)) return obj.plans;
          return [];
        };

        // Reset expert routing context before remapping plans
        this.nutritionistInsight.expert = 'Loading...';
        this.nutritionistInsight.expertId = '';
        this.nutritionistInsight.role = 'Nutritionist';
        this.nutritionistInsight.image = '';

        const plansRaw = extract(res.allPlans);
        const myPlansRaw = extract(res.myPlans);
        this.gyms = extract(res.gyms);

        // Extract IDs from myPlans (handling both direct and nested plan structures)
        const myIds = myPlansRaw.map((p: any) => String(p.id_plan || (p.plan?.id_plan || p.id)));

        this.nutritionPlans = plansRaw.map((item: any) => {
          // Normalize: check if the plan data is nested (common in some API responses)
          const plan = item.plan || item;
          const gym = this.gyms.find((g: any) => String(g.id_gym) === String(plan.id_gym || item.id_gym));
          const planId = String(plan.id_plan || plan.id || item.id);

          return {
            ...plan,
            id_plan: planId,
            name: plan.name || plan.title || 'Nutrition Plan',
            description: plan.description || plan.goal || 'No description available.',
            image: plan.image ? this.getAvatarUrl(plan.image) : null,
            isOwned: myIds.includes(planId),
            isActive: plan.is_active !== undefined ? !!plan.is_active : true,
            gymName: gym?.name || 'Global Hub',
            gymLogo: gym?.logo || (gym?.name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(gym.name)}&background=1e293b&color=10b981&bold=true` : 'https://ui-avatars.com/api/?name=Hub&background=1e293b&color=10b981&bold=true'),
            macroStatus: this.calculateMacros(plan),
            nutritionist: plan.nutritionist || item.nutritionist || null
          };
        });

        // Map owned plans specifically to handle nutritionist mapping
        this.ownedPlans = this.nutritionPlans.filter(p => p.isOwned);

        if (this.activePlan) {
          const stillOwned = this.ownedPlans.find(p => (p.id_plan || p.id) === (this.activePlan.id_plan || this.activePlan.id));
          if (!stillOwned) {
            this.activePlan = this.ownedPlans[0] || null;
          }
        } else {
          this.activePlan = this.ownedPlans[0] || null;
        }

        if (this.activePlan) {
          this.syncNutritionistFromPlan(this.activePlan);
          this.loadActivePlanDetails(this.activePlan.id_plan || this.activePlan.id);
        }

        // Dynamic Bio-Insight Synchronization (from Member Dashboard Stats)
        if (res.stats) {
          this.analyzedBiometrics = res.stats.stats; // Current real progress
          if (res.stats.stats?.water) {
            this.waterIntake = res.stats.stats.water;
          }
          if (res.stats && res.stats.user) {
            const userAdvisory = res.stats.user.nutritionist_advisory;
            const internalNotes = res.stats.user.nutritionist_notes;

            // Concatenate internal observations and advisory for a comprehensive view
            let combinedMessage = '';
            if (internalNotes && internalNotes.trim() !== '') {
              combinedMessage += internalNotes.trim();
            }
            if (userAdvisory && userAdvisory.trim() !== '') {
              if (combinedMessage) combinedMessage += '\n\n---\nProfessional Remark:\n';
              combinedMessage += userAdvisory.trim();
            }

            this.nutritionistInsight.message = combinedMessage || 'Waiting for your nutritionist to provide feedback...';

            this.nutritionistInsight.timestamp = res.stats.user.updated_at ? 'Verified' : 'Updated';
          }
        }

        // If active plan has no nutritionist metadata, fallback to profile stats
        if (!this.nutritionistInsight.expertId && res.stats.user?.nutritionist) {
          // Fallback to assigned nutritionist from stats if available
          const n = res.stats.user.nutritionist;
          this.nutritionistInsight.expert = `${n.name} ${n.last_name || ''}`;
          this.nutritionistInsight.expertId = String(n.id_user || n.id || '').trim();
          this.nutritionistInsight.role = 'Specialist';
          this.nutritionistInsight.image = n.profile_picture;
        }

        // Final deep-fallback: If still no expert ID, check all owned plans
        if (!this.nutritionistInsight.expertId) {
          const planWithExpert = this.ownedPlans.find(p => p.nutritionist?.id_user || p.nutritionist?.id || p.id_nutritionist);
          if (planWithExpert) {
            const n = planWithExpert.nutritionist || { name: 'Specialist', id_user: planWithExpert.id_nutritionist };
            this.nutritionistInsight.expert = `${n.name} ${n.last_name || ''}`.trim();
            this.nutritionistInsight.expertId = String(n.id_user || n.id || planWithExpert.id_nutritionist || '').trim();
            this.nutritionistInsight.role = 'Verified Professional';
          }
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Data Sync Error:', err);
        this.errorMessage = err.error?.message || 'Failed to load nutrition data. Please check your connection.';
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

  confirmPayment(event: any) {
    if (!this.selectedPlan) return;
    this.processingPayment = true;

    if (event.method === 'zen_wallet') {
      const planId = this.selectedPlan.id_plan;
      this.memberService.purchaseNutritionPlan(planId, 'zen_wallet')
        .subscribe({
          next: (res) => {
            this.processingPayment = false;
            this.showPaymentModal = false;
            // Immediate Bio-Pulse Refresh
            this.loadAllNutritionData();
          },
          error: (err: any) => this.handleError(err)
        });
    } else {
      this.memberService.createPaymentIntent(this.selectedPlan.id_gym, this.selectedPlan.price || 19.99).subscribe({
        next: (res: any) => {
          event.stripe.confirmCardPayment(res.client_secret, {
            payment_method: { card: event.card }
          }).then((result: any) => {
            if (result.error) {
              this.handleError({ error: { message: result.error.message } });
            } else if (result.paymentIntent.status === 'succeeded') {
              this.memberService.purchaseNutritionPlan(this.selectedPlan.id_plan || this.selectedPlan.id, 'credit_card').subscribe({
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
    this.paymentError = err.error?.message || 'Payment failed.';
    this.processingPayment = false;
    this.cdr.detectChanges();
  }

  calculateMacros(plan: any) {
    const p = plan.protein || 0;
    const c = plan.carbs || 0;
    const f = plan.fats || 0;
    let calories = (p * 4) + (c * 4) + (f * 9);
    if (!calories) calories = plan.calories || 0;

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
