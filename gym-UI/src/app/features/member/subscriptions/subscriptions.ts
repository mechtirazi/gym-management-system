import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-member-subscriptions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.scss'
})
export class SubscriptionsComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  subscriptions: any[] = [];
  loading = true;
  error = '';

  // Payment Gateway States
  showPaymentPicker = false;
  isProcessingPayment = false;
  selectedSubscriptionId: string | null = null;
  selectedGymId: string | null = null;

  // Toast Notification State
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  ngOnInit(): void {
    this.fetchEnrollments();
  }

  fetchEnrollments(): void {
    this.loading = true;
    this.memberService.getMyEnrollments().subscribe({
      next: (res: any) => {
        this.subscriptions = res.data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Enrollment Sync Error:', err);
        this.error = 'Failed to synchronize training nodes. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'active' || s === 'completed') return 'status-active';
    if (s === 'expired' || s === 'cancelled') return 'status-expired';
    return 'status-pending';
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

  isStandardPlan(planName: string): boolean {
    return planName?.toLowerCase().includes('standard');
  }

  reactivate(sub: any) {
    this.selectedSubscriptionId = sub.id_subscribe;
    this.selectedGymId = sub.gym_id || sub.gym?.id_gym || sub.gym?.gym_id;
    this.showPaymentPicker = true;
  }

  processPurchase(method: 'zen_wallet' | 'credit_card') {
    if (!this.selectedGymId) {
      this.showToast('Initialization Error: Gym ID not synced properly.', 'error');
      return;
    }

    this.isProcessingPayment = true;
    this.memberService.purchaseMembership(this.selectedGymId, method).subscribe({
      next: (res: any) => {
        this.showPaymentPicker = false;
        this.isProcessingPayment = false;
        this.showToast(res.message || 'Node reactivation successful!', 'success');
        this.fetchEnrollments(); // Reload
      },
      error: (err: any) => {
        this.isProcessingPayment = false;
        this.showToast(err.error?.message || 'Payment synchronization failed. Check your credits.', 'error');
      }
    });
  }

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
}
