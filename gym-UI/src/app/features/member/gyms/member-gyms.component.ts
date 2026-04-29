import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-member-gyms',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PaymentModalComponent],
  templateUrl: './member-gyms.component.html',
  styleUrl: './member-gyms.component.scss'
})
export class MemberGymsComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  gyms: any[] = [];
  loading = true;
  errorMessage = '';
  searchTerm = '';
  activeFilter = 'All Facilities';
  filterCategories = ['All Facilities', 'Performance', 'Movement', 'Bio-Hacking', 'Boxing', 'Wellness'];

  // Payment State
  showPaymentModal = false;
  selectedGym: any = null;
  processingPayment = false;
  paymentError: string | null = null;
  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI'

  membershipPlans: any[] = [];

  get filteredGyms() {
    return this.gyms.filter(gym => {
      const matchSearch = !this.searchTerm ||
        gym.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        gym.adress?.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Since gyms might not have categories mapped properly in DB yet,
      // we mock the filter for the UI demonstration
      const matchFilter = this.activeFilter === 'All Facilities' ||
        (gym.name?.length % this.filterCategories.length === this.filterCategories.indexOf(this.activeFilter));

      return matchSearch && (this.activeFilter === 'All Facilities' ? true : matchFilter);
    });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  ngOnInit(): void {
    this.loadGyms();
  }

  loadGyms(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      allGyms: this.memberService.getAllGyms().pipe(catchError(() => of({ data: [] }))),
      mySubscriptions: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] }))),
      myEnrollments: this.memberService.getMyEnrollments().pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (res: any) => {
        const extract = (obj: any): any[] => {
          if (!obj) return [];
          if (Array.isArray(obj)) return obj;
          if (Array.isArray(obj.data)) return obj.data;
          if (obj.data && Array.isArray(obj.data.data)) return obj.data.data;
          return [];
        };

        const rawGyms = extract(res.allGyms);
        const mySubs = extract(res.mySubscriptions);
        const myEnrolls = extract(res.myEnrollments);

        const enrolledGymIds = myEnrolls
          .filter((e: any) => e.status?.toLowerCase() === 'active' || e.status?.toLowerCase() === 'pending')
          .map((e: any) => e.id_gym || e.gym_id);

        this.gyms = rawGyms.map((gym: any) => {
          const sub = mySubs.find((s: any) => (s.id_gym || s.gym_id) === gym.id_gym);
          return {
            ...gym,
            isSubscribed: !!sub,
            subscriptionId: sub?.id_subscribe || sub?.id_subscription || sub?.id,
            isEnrolled: enrolledGymIds.includes(gym.id_gym)
          };
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to synchronize hub data', err);
        this.errorMessage = 'An error occurred while loading the hub nodes.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }

  getGymInitials(name?: string): string {
    if (!name) return 'GY';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  onFollowToggle(gym: any): void {
    if (gym.isSubscribed) {
      // Unfollow Logic
      if (confirm(`De-synchronize from ${gym.name}? You will lose access to their localized protocols.`)) {
        this.memberService.unfollowGym(gym.subscriptionId).subscribe({
          next: () => this.loadGyms(),
          error: (err) => console.error('Unfollow failed', err)
        });
      }
    } else {
      // Follow Logic
      this.memberService.followGym(gym.id_gym).subscribe({
        next: () => this.loadGyms(),
        error: (err) => {
          console.error('Follow failed', err);
          alert('Could not synchronize follow protocol.');
        }
      });
    }
  }

  onLike(gymId: string): void {
    alert(`Node ${gymId} marked as favorite. Synchronizing with your Bio-Profile.`);
  }

  isGymOpen(gym: any): boolean {
    if (!gym) return false;
    
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday... 6 = Saturday
    
    let hoursStr = '';
    if (day === 0) {
      hoursStr = gym.open_sun;
    } else if (day === 6) {
      hoursStr = gym.open_sat;
    } else {
      hoursStr = gym.open_mon_fri;
    }

    if (!hoursStr || hoursStr.toLowerCase() === 'closed') return false;
    
    // Parse "06:00 - 22:00"
    const parts = hoursStr.split('-');
    if (parts.length !== 2) return true; // If format unknown, assume open

    try {
      const [startStr, endStr] = parts.map(p => p.trim());
      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);

      const currentH = now.getHours();
      const currentM = now.getMinutes();
      
      const currentTotalM = currentH * 60 + currentM;
      const startTotalM = (startH || 0) * 60 + (startM || 0);
      const endTotalM = (endH || 0) * 60 + (endM || 0);

      return currentTotalM >= startTotalM && currentTotalM <= endTotalM;
    } catch (e) {
      return true; // Fallback to open on parse error
    }
  }

  onEnroll(gym: any): void {
    this.selectedGym = gym;
    this.paymentError = null;

    this.memberService.getGymPlans(gym.id_gym).subscribe({
      next: (plansRes: any) => {
        if (plansRes.data && plansRes.data.length > 0) {
          this.membershipPlans = plansRes.data;
        } else {
           this.membershipPlans = [];
        }
        this.showPaymentModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Could not load plans', err);
        this.membershipPlans = [];
        this.showPaymentModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedGym = null;
    this.cdr.detectChanges();
  }

  completePurchase(event: any) {
    if (!this.selectedGym) return;

    const method = event.method;
    this.processingPayment = true;
    this.paymentError = null;

    const plan = event.plan || { id: 'standard', price: 49.99 };

    if (method === 'zen_wallet') {
      this.memberService.purchaseMembership(this.selectedGym.id_gym, 'zen_wallet', plan.type || 'standard', plan.id).subscribe({
        next: (res: any) => this.handlePurchaseSuccess(res),
        error: (err: any) => this.handlePurchaseError(err)
      });
    } else if (method === 'stripe' || method === 'credit_card') {
      // 1. Create Payment Intent with specific amount
      this.memberService.createPaymentIntent(this.selectedGym.id_gym, plan.price).subscribe({
        next: (res: any) => {
          const clientSecret = res.client_secret;
          // 2. Confirm Payment via Stripe Elements
          event.stripe.confirmCardPayment(clientSecret, {
            payment_method: { card: event.card }
          }).then((result: any) => {
            if (result.error) {
              this.handlePurchaseError({ error: { message: result.error.message } });
            } else if (result.paymentIntent.status === 'succeeded') {
              // 3. Finalize on backend
              this.memberService.purchaseMembership(this.selectedGym.id_gym, 'credit_card', plan.type || 'standard', plan.id).subscribe({
                next: (res: any) => this.handlePurchaseSuccess(res),
                error: (err: any) => this.handlePurchaseError(err)
              });
            }
          });
        },
        error: (err: any) => this.handlePurchaseError(err)
      });
    }
  }

  private handlePurchaseSuccess(res: any) {
    console.log('PURCHASE SUCCESS:', res);
    this.processingPayment = false;
    this.closePaymentModal();
    this.loadGyms();
    this.cdr.detectChanges();
  }

  private handlePurchaseError(err: any) {
    console.error('PURCHASE FAILURE:', err);
    this.paymentError = err.error?.message || 'Access synchronization failed.';
    this.processingPayment = false;
    this.cdr.detectChanges();
  }
}
