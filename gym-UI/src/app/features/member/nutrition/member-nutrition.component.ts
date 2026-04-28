import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';
import { PageHeaderComponent } from '../../owner/components/page-header/page-header.component';

@Component({
  selector: 'app-member-nutrition',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaymentModalComponent,
    PageHeaderComponent
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
    expert: 'Initializing...',
    role: 'Clinical Specialist',
    message: 'Synchronizing biological protocols...',
    timestamp: 'Just now'
  };

  analyzedBiometrics: any = null;

  // --- POWERFUL REAL-TIME BIO-SYNC STATE ---
  waterIntake = 0;
  waterGoal = 3500; 
  dailyMeals: any[] = [];
  supplementStack: any[] = [];
  showShoppingList = false;
  shoppingIngredients: any[] = [];

  setTab(tab: 'insights' | 'shop') {
    this.activeTab = tab;
    if (tab === 'shop') this.currentPage = 1;
    this.cdr.detectChanges();
  }

  switchProtocol(plan: any) {
    this.activePlan = plan;
    this.loadActivePlanDetails(plan.id_plan || plan.id);
    this.cdr.detectChanges();
  }

  loadActivePlanDetails(planId: string) {
    this.memberService.getNutritionPlanDetails(planId).subscribe({
      next: (res: any) => {
        const planData = res.data;
        this.dailyMeals = planData.meals || [];
        this.supplementStack = planData.supplements || [];
        // Generate shopping list from meals
        this.shoppingIngredients = this.generateShoppingList(this.dailyMeals);
        this.cdr.detectChanges();
      }
    });
  }

  generateShoppingList(meals: any[]) {
    // Simple heuristic for demo/prototype but dynamic from DB
    const list: any[] = [];
    if (meals.length > 0) {
      list.push({ category: 'High-Bioavailability Proteins', items: meals.map(m => m.name.split(' ')[0] + ' Source') });
      list.push({ category: 'Glycemic-Controlled Carbs', items: ['Organic Quinoa', 'Sweet Potato', 'Black Rice'] });
    }
    return list;
  }

  bridgeContact(expert: string) {
    console.log(`Initiating Bio-Sync Bridge with ${expert}`);
    alert(`Syncing direct bridge with ${expert}. Message center initialization in progress...`);
  }

  viewExpertRemarks() {
    if (this.nutritionistInsight.message) {
      document.querySelector('.nutritionist-bridge-card')?.scrollIntoView({ behavior: 'smooth' });
      this.showAdvisoryModal = true;
      this.cdr.detectChanges();
    } else {
      this.showAdvisoryModal = true;
      this.cdr.detectChanges();
    }
  }

  closeAdvisory() {
    this.showAdvisoryModal = false;
    this.cdr.detectChanges();
  }

  viewActiveDetails() {
    if (this.activePlan) {
      this.showShoppingList = true;
      this.cdr.detectChanges();
    }
  }

  // Hydration Intelligence
  addWater(amount: number) {
    this.memberService.logHydration(amount).subscribe({
      next: (res: any) => {
        this.waterIntake = res.total_today;
        this.cdr.detectChanges();
      }
    });
  }

  resetWater() {
    this.waterIntake = 0;
    this.cdr.detectChanges();
  }

  get waterPercentage() {
    return Math.min((this.waterIntake / this.waterGoal) * 100, 100);
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

  closeShoppingList() {
    this.showShoppingList = false;
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

        const plansRaw = extract(res.allPlans);
        const myPlans = extract(res.myPlans);
        this.gyms = extract(res.gyms);
        
        // 1. Process active plans with dynamic specialist data
        this.ownedPlans = myPlans.map((p: any) => {
          const nutritionist = p.nutritionist || {};
          return {
            ...p,
            gymName: p.gym?.name || 'Local Resource Hub',
            gymLogo: p.gym?.picture || 'https://ui-avatars.com/api/?name=Gym&background=random',
            expertName: nutritionist.name || 'Clinical Lead',
            expertRole: nutritionist.role || 'Senior Nutritionist',
            expertImage: nutritionist.profile_picture || `https://ui-avatars.com/api/?name=${nutritionist.name || 'Expert'}&background=8b5cf6&color=fff&bold=true`
          };
        });

        // 2. Set Active Protocol & Dynamic Advisory
        if (this.ownedPlans.length > 0) {
          this.activePlan = this.ownedPlans[0];
          this.loadActivePlanDetails(this.activePlan.id_plan || this.activePlan.id);
          
          // Update the Expert Bridge dynamically
          this.nutritionistInsight = {
            expert: this.activePlan.expertName,
            role: this.activePlan.expertRole,
            message: user?.advisory || 'Metabolic synchronization active. No active directives at this time.',
            timestamp: 'Real-time Sync'
          };
        }

        const myIds = myPlans.map((p: any) => p.id_plan || p.id);

        this.nutritionPlans = plansRaw.map((plan: any) => {
          const gym = this.gyms.find((g: any) => g.id_gym === plan.id_gym);
          return {
            ...plan,
            isOwned: myIds.includes(plan.id_plan || plan.id),
            isActive: plan.is_active !== undefined ? !!plan.is_active : true,
            gymName: gym?.name || 'Global Hub',
            gymLogo: gym?.logo || (gym?.name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(gym.name)}&background=1e293b&color=10b981&bold=true` : 'https://ui-avatars.com/api/?name=Hub&background=1e293b&color=10b981&bold=true'),
            macroStatus: this.calculateMacros(plan)
          };
        });

        // Dynamic High-Performance Protocol Selection
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
          this.loadActivePlanDetails(this.activePlan.id_plan || this.activePlan.id);
        }

        // Dynamic Bio-Insight Synchronization (from Member Dashboard Stats)
        if (res.stats) {
          this.analyzedBiometrics = res.stats.stats; // Current real progress
          if (res.stats.stats?.water) {
            this.waterIntake = res.stats.stats.water;
          }
          if (res.stats.user?.nutritionist_advisory) {
            this.nutritionistInsight.message = res.stats.user.nutritionist_advisory;
            this.nutritionistInsight.timestamp = res.stats.user.updated_at ? 'Pulse Verified' : 'Live Sync';
          }
        }

        // If active plan has a nutritionist assigned, sync expert profile
        if (this.activePlan?.nutritionist) {
          this.nutritionistInsight.expert = `${this.activePlan.nutritionist.name} ${this.activePlan.nutritionist.last_name || ''}`;
          this.nutritionistInsight.role = 'Assigned Bio-Specialist';
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Bio-Hub Sync Error:', err);
        this.errorMessage = err.error?.message || 'Evolutionary pulse synchronization failed. Check your API Hub connectivity.';
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
      this.memberService.purchaseNutritionPlan(planId)
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
    this.paymentError = err.error?.message || 'Access synchronization failed.';
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
