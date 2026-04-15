import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-member-subscriptions',
  standalone: true,
  imports: [CommonModule, RouterLink, PaymentModalComponent],
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
  selectedSubscription: any = null;
  membershipPlans: any[] = [];
  paymentError: string | null = null;
  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI';

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
    this.selectedSubscription = sub;

    if (this.selectedGymId) {
      this.memberService.getGymPlans(this.selectedGymId).subscribe({
        next: (plansRes: any) => {
          if (plansRes.data && plansRes.data.length > 0) {
            this.membershipPlans = plansRes.data;
          } else {
             this.membershipPlans = [
               { id: 'standard', name: 'Standard Tier', price: 49.99, description: 'Default Access.' }
             ];
          }
          this.showPaymentPicker = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.warn('Could not load plans', err);
          this.membershipPlans = [];
          this.showPaymentPicker = true;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.showPaymentPicker = true;
    }
  }

  processPurchase(event: any) {
    if (!this.selectedGymId) {
      this.showToast('Initialization Error: Gym ID not synced properly.', 'error');
      return;
    }

    this.isProcessingPayment = true;
    this.paymentError = null;
    this.cdr.detectChanges();

    const plan = event.plan;
    if (!plan) {
      this.showToast('Validation Error: No synchronization tier selected.', 'error');
      this.isProcessingPayment = false;
      return;
    }

    if (event.method === 'zen_wallet') {
      this.memberService.purchaseMembership(this.selectedGymId!, 'zen_wallet', plan.type || plan.id, plan.id).subscribe({
        next: (res: any) => this.handleSuccess(res),
        error: (err: any) => this.handleError(err)
      });
    } else {
      const amount = plan.price;
      // Stripe flow
      this.memberService.createPaymentIntent(this.selectedGymId!, amount).subscribe({
        next: (res: any) => {
          event.stripe.confirmCardPayment(res.client_secret, {
            payment_method: { card: event.card }
          }).then((result: any) => {
            if (result.error) {
              this.handleError({ error: { message: result.error.message } });
            } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
      this.memberService.purchaseMembership(this.selectedGymId!, 'credit_card', plan.type || plan.id, plan.id).subscribe({
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
    this.showPaymentPicker = false;
    this.isProcessingPayment = false;
    this.showToast(res.message || 'Node reactivation successful!', 'success');
    this.fetchEnrollments();
    this.cdr.detectChanges();
  }

  private handleError(err: any) {
    console.error('PAYMENT FAILURE:', err);
    this.paymentError = err.error?.message || 'Access synchronization failed.';
    window.alert('PAYMENT DECLINED:\\n\\n' + this.paymentError);
    this.isProcessingPayment = false;
    this.cdr.detectChanges();
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
