import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/user.model';
import { Observable, forkJoin, map, of, Subject, debounceTime, switchMap, catchError } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
  templateUrl: './member-dashboard.component.html',
  styleUrl: './member-dashboard.component.scss'
})
export class MemberDashboardComponent implements OnInit {
  private memberService = inject(MemberService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  user = this.authService.currentUser; // Use Signal directly
  stats: any = {
    activeWorkouts: 0,
    completedSessions: 0,
    caloriesBurned: 0,
    attendanceStreak: 0,
    walletBalance: 0,
    wallets: [],
    protein: 0,
    carbs: 0,
    fats: 0,
    water: 0,
    weight: 0
  };

  upcomingSessions: any[] = [];
  nutritionPlan: any = null;
  recentActivity: any[] = [];
  activeSubscription: any = null;
  activeEnrollment: any = null;

  // Checkout State
  showPaymentPicker = false;
  isProcessingPayment = false;
  paymentError: string | null = null;
  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI';
  membershipPlans: any[] = [];
  
  showEliteBenefitsModal = false;
  showQRModal = false;
  isSyncing = false;
  isUpdatingBio = false;
  qrCodeUrl: string = '';
  
  // Wallet State
  selectedWalletGymId: string | null = null;
  selectedWalletBalance: number = 0;

  // Goal State
  fitnessGoal: 'cut' | 'maintain' | 'bulk' = 'maintain';

  // Toast Notification State
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  private biometricsUpdate$ = new Subject<any>();

  ngOnInit(): void {
    this.loadDashboardData();

    // Listen for global upgrade triggers (e.g. from sidebar)
    this.memberService.upgradeTriggered$.subscribe(() => {
      this.initiateUpgrade();
    });

    // The Sync-Shield: Debounce rapid inputs and handle synchronization
    this.biometricsUpdate$.pipe(
      debounceTime(1000),
      switchMap(payload => {
        this.isUpdatingBio = true;
        return this.memberService.updateBiometrics(payload);
      })
    ).subscribe({
      next: (response: any) => {
        this.isUpdatingBio = false;
        if (response.stats) {
          const backendStats = response.stats?.stats;
          this.stats = {
            ...this.stats,
            caloriesBurned: backendStats?.calories || 0,
            protein: backendStats?.protein || 0,
            carbs: backendStats?.carbs || 0,
            fats: backendStats?.fats || 0,
            water: backendStats?.water || 0,
            weight: backendStats?.weight || 0
          };
          this.cdr.detectChanges();
        }
      },
      error: () => this.isUpdatingBio = false
    });
  }

  loadDashboardData(): void {
    const user = this.user();
    if (user && user.id_user) {
      this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MEMBER_SYNC:${user.id_user}&bgcolor=0f172a&color=8b5cf6&margin=20`;
    }

    forkJoin({
      stats: this.memberService.getDashboardStats().pipe(catchError(() => of({ stats: {} }))),
      enrollments: this.memberService.getMyEnrollments().pipe(catchError(() => of({ data: [] }))),
      attendances: this.memberService.getMyAttendances().pipe(catchError(() => of({ data: [] }))),
      nutrition: this.memberService.getMyNutritionPlans().pipe(catchError(() => of({ data: [] }))),
      subscriptions: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] })))
    }).pipe(
      map((data: any) => {
        const backendStats = data.stats?.stats;
        return {
          ...data,
          mappedStats: {
            activeWorkouts: backendStats?.enrollments || 0,
            completedSessions: backendStats?.totalAttendance || 0,
            caloriesBurned: backendStats?.calories || 0,
            attendanceStreak: backendStats?.activeSubscriptions || 0,
            walletBalance: backendStats?.walletBalance || 0,
            wallets: backendStats?.wallets || [],
            protein: backendStats?.protein || 0,
            carbs: backendStats?.carbs || 0,
            fats: backendStats?.fats || 0,
            water: backendStats?.water || 0,
            weight: backendStats?.weight || 0
          }
        };
      })
    ).subscribe({
      next: (data: any) => {
        this.upcomingSessions = data.enrollments?.data || [];
        this.recentActivity = data.attendances?.data || [];
        this.nutritionPlan = data.nutrition?.data?.[0] || null;

        const enrs = data.enrollments?.data || [];
        this.activeEnrollment = enrs.find((e: any) => (e.status?.toLowerCase() === 'active' || e.status?.toLowerCase() === 'pending') && !e.id_course);

        this.stats = data.mappedStats;
        
        // Initialize default selected wallet if wallets exist
        if (this.stats.wallets && this.stats.wallets.length > 0) {
          this.selectedWalletGymId = this.stats.wallets[0].id_gym;
          this.selectedWalletBalance = this.stats.wallets[0].balance;
        } else {
          this.selectedWalletBalance = this.stats.walletBalance;
        }

        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading member dashboard', err);
        this.cdr.detectChanges();
      }
    });
  }

  onWalletGymChange(): void {
    if (this.stats.wallets && this.selectedWalletGymId) {
      const selectedWallet = this.stats.wallets.find((w: any) => w.id_gym === this.selectedWalletGymId);
      if (selectedWallet) {
        this.selectedWalletBalance = selectedWallet.balance;
      }
    }
  }

  onCheckIn(): void {
    if (this.isSyncing) return;
    this.showQRModal = true;
    this.isSyncing = true;

    this.memberService.checkIn().subscribe({
      next: () => {
        this.isSyncing = false;
        // Keep modal open so they can see the QR, but stats update in background
        this.loadDashboardData();
      },
      error: () => this.isSyncing = false
    });
  }

  closeQRModal(): void {
    this.showQRModal = false;
  }

  updateBiometrics(metric: string, value: string | number): void {
    const val = Number(value);
    if (isNaN(val)) return;

    // Mapping between API keys and local stat keys
    const metricMap: any = {
      'calories': 'caloriesBurned',
      'protein': 'protein',
      'carbs': 'carbs',
      'fats': 'fats',
      'water': 'water',
      'weight': 'weight'
    };

    const localKey = metricMap[metric];
    if (localKey) {
      this.stats[localKey] = val;
    }

    // Auto-calculate calories if macros change
    if (['protein', 'carbs', 'fats'].includes(metric)) {
      this.stats.caloriesBurned = (this.stats.protein * 4) + (this.stats.carbs * 4) + (this.stats.fats * 9);
    }

    // Always send the full biometric payload to avoid data loss during rapid updates
    const payload = {
      calories: this.stats.caloriesBurned,
      protein: this.stats.protein,
      carbs: this.stats.carbs,
      fats: this.stats.fats,
      water: this.stats.water,
      weight: this.stats.weight
    };

    this.biometricsUpdate$.next(payload as any);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  getDaysLeft(endDate: string): number {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }

  getSubscriptionProgress(endDate: string, type: string = 'standard'): number {
    if (!endDate) return 0;
    const total = (type?.toLowerCase() === 'premium') ? 90 : 30;
    const left = this.getDaysLeft(endDate);
    return Math.min(100, Math.round((left / total) * 100));
  }

  getTargetCalories(): number {
    // Dynamic TDEE calculation based on body weight
    const weight = this.stats.weight || 70; // default to 70kg if unrecorded
    let tdee = Math.round(weight * 24 * 1.375); // basic metabolism + light activity logic

    // Adapt to their specific mass goal
    if (this.fitnessGoal === 'cut') {
      tdee -= 500; // Caloric deficit
    } else if (this.fitnessGoal === 'bulk') {
      tdee += 500; // Caloric surplus
    }

    return tdee;
  }

  onFitnessGoalChange(event: any): void {
    this.fitnessGoal = event.target.value;
    // Re-trigger visual updates
    this.cdr.detectChanges();
  }

  getMacroPercentage(macro: string): number {
    const targetCals = this.getTargetCalories();
    if (!targetCals) return 0;

    let targetMacroCals = 0;
    let currentMacroCals = 0;

    // Standard split: Protein 30%, Carbs 40%, Fats 30%
    if (macro === 'protein') {
      targetMacroCals = targetCals * 0.30;
      currentMacroCals = (this.stats.protein || 0) * 4;
    } else if (macro === 'carbs') {
      targetMacroCals = targetCals * 0.40;
      currentMacroCals = (this.stats.carbs || 0) * 4;
    } else if (macro === 'fats') {
      targetMacroCals = targetCals * 0.30;
      currentMacroCals = (this.stats.fats || 0) * 9;
    }

    const percentage = targetMacroCals > 0 ? (currentMacroCals / targetMacroCals) * 100 : 0;
    return Math.min(percentage, 100);
  }

  getMacroTargetMsg(macro: string): string {
    const percentage = this.getMacroPercentage(macro);
    if (percentage >= 100) return 'OPTIMAL';
    if (percentage >= 50) return 'ON TRACK';
    return 'REPLENISHING';
  }

  // --- New Interactive Handlers ---

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.cdr.detectChanges();

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  handleRedeem(): void {
    this.showPaymentPicker = true;
  }

  showLedger(): void {
    this.showToast('Wallet Ledger Protocol: Pulling transaction history from facility logs... (This feature will be available in the next deployment cycle)', 'info');
  }

  joinSession(session: any): void {
    this.showToast(`Syncing biometric signature with ${session.course?.name || 'Training Session'}... You are now physically expected at the facility.`, 'success');
  }

  initiateUpgrade(): void {
    this.showEliteBenefitsModal = true;
    this.cdr.detectChanges();
  }

  proceedToPayment(): void {
    this.showEliteBenefitsModal = false;
    this.showPaymentPicker = true;
    this.cdr.detectChanges();
  }

  processPurchase(event: any) {
    const gymId = this.activeSubscription?.id_gym || this.activeSubscription?.gym?.id_gym;
    if (!gymId) {
      this.showToast('Protocol Error: Accessing gym facility failed.', 'error');
      return;
    }

    const method = event.method;
    const plan = event.plan;
    if (!plan) {
      this.showToast('Validation Error: No synchronization tier selected.', 'error');
      return;
    }
    
    this.isProcessingPayment = true;
    this.paymentError = null;

    if (method === 'zen_wallet') {
      this.memberService.purchaseMembership(gymId, 'zen_wallet', plan.type || plan.id, plan.id).subscribe({
        next: (res: any) => this.handlePurchaseSuccess(res),
        error: (err: any) => this.handlePurchaseError(err)
      });
    } else if (method === 'stripe' || method === 'credit_card' || method === 'stripe_checkout') {
      // Simulate Stripe/External payment confirmation
      setTimeout(() => {
        this.memberService.purchaseMembership(gymId, 'credit_card', plan.type || plan.id, plan.id).subscribe({
          next: (res: any) => this.handlePurchaseSuccess(res),
          error: (err: any) => this.handlePurchaseError(err)
        });
      }, 1500);
    }
  }

  private handlePurchaseSuccess(res: any) {
    this.showPaymentPicker = false;
    this.isProcessingPayment = false;
    this.showToast(res.message || 'Payment successful! Elite access protocols active.', 'success');
    this.loadDashboardData();
    this.cdr.detectChanges();
  }

  private handlePurchaseError(err: any) {
    this.isProcessingPayment = false;
    this.paymentError = err.error?.message || 'Payment synchronization failed.';
    this.showToast(this.paymentError || 'Error', 'error');
    this.cdr.detectChanges();
  }
}
