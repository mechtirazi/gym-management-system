import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MemberService } from '../services/member.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { FormsModule } from '@angular/forms';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-member-gym-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PaymentModalComponent],
  templateUrl: './member-gym-profile.component.html',
  styleUrl: './member-gym-profile.component.scss'
})
export class MemberGymProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  gym: any = null;
  courses: any[] = [];
  isSubscribed = false;
  isFollowing = false;
  membershipPlans: any[] = [];
  subscriptionId?: string;
  loading = true;
  errorMessage = '';
  mapUrl: SafeResourceUrl | null = null;
  activeTab: 'overview' | 'training' | 'community' = 'overview';

  // Payment Gateway States
  showPaymentPicker = false;
  isProcessingPayment = false;

  // Review Hub States
  showReviewModal = false;
  isSubmittingReview = false;
  reviewData = {
    rating: 5,
    comment: ''
  };


  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI';
  paymentError: string | null = null;
  gymReviews: any[] = [];

  // Toast Notification State
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  // Real-time Simulation Data
  currentOccupancy = 0;
  loadColor = '#4ade80';
  todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Mon, 6=Sun

  get averageRating(): number {
    if (!this.gymReviews || this.gymReviews.length === 0) {
      return parseFloat(this.gym?.avg_rating || '5.0');
    }
    const sum = this.gymReviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return parseFloat((sum / this.gymReviews.length).toFixed(1));
  }

  getStarCount(star: number): number {
    return this.gymReviews.filter(r => Math.round(r.rating) === star).length;
  }

  getStarPercentage(star: number): number {
    if (this.gymReviews.length === 0) return 0;
    return (this.getStarCount(star) / this.gymReviews.length) * 100;
  }

  getUserGradient(userId?: string): string {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #a855f7)',
      'linear-gradient(135deg, #ec4899, #8b5cf6)',
      'linear-gradient(135deg, #3b82f6, #2dd4bf)',
      'linear-gradient(135deg, #f59e0b, #ef4444)'
    ];
    if (!userId) return gradients[0];

    // Simple hash to pick a gradient based on the ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  ngOnInit() {
    const gymId = this.route.snapshot.paramMap.get('id');
    if (gymId) {
      this.loadAllData(gymId);
    }
  }

  loadAllData(id: string) {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    // ForkJoin to fetch gym profile, courses, and check subscription simultaneously
    forkJoin({
      allGyms: this.memberService.getAllGyms().pipe(catchError(() => of({ data: [] }))),
      allCourses: this.memberService.getAvailableCourses().pipe(catchError(() => of({ data: [] }))),
      mySubs: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] }))),
      enrollments: this.memberService.getMyEnrollments().pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (res: any) => {
        // Find specific gym
        const gyms = Array.isArray(res.allGyms.data) ? res.allGyms.data : (res.allGyms.data?.data || []);
        this.gym = gyms.find((g: any) => g.id_gym === id) || gyms[0];

        // Find courses for this gym (Filtering by id_gym)
        const allCourses = res.allCourses.data?.data || res.allCourses.data || [];
        this.courses = allCourses.filter((c: any) => (c.id_gym || c.gym_id) === id);

        // Remove mock data fallback to ensure only real courses are shown
        if (this.courses.length === 0) {
          console.warn('No courses found for this facility.');
        }

        // Check membership/subscription status
        const mySubs = res.mySubs.data || res.mySubs || [];
        const enrollments = res.enrollments?.data || res.enrollments || [];

        const gymSub = mySubs.find((s: any) => s.id_gym === id);
        this.isFollowing = !!gymSub;
        this.subscriptionId = gymSub?.id_subscribe;

        this.isSubscribed = (gymSub && gymSub.status === 'active' && gymSub.id_plan) ||
          enrollments.some((e: any) => e.id_gym === id);

        // Simulation of live metrics
        this.calculateLiveMetrics();

        // Generate Dynamic Map Hub
        this.generateMapUrl();

        // Fetch gym reviews
        this.fetchReviews(id);

        // Fetch dynamic plans for this gym
        this.memberService.getGymPlans(id).subscribe({
          next: (plansRes: any) => {
            if (plansRes.data && plansRes.data.length > 0) {
              this.membershipPlans = plansRes.data;
            }
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.warn('Could not fetch dynamic plans, using default protocol.', err);
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Failed to sync hub data', err);
        this.errorMessage = 'A sync error occurred. Check your network.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  generateMapUrl() {
    if (!this.gym || !this.gym.adress) return;
    const cleanAddress = encodeURIComponent(this.gym.adress);
    const baseUrl = `https://www.google.com/maps/embed/v1/place?key=REPLACE_WITH_YOUR_KEY&q=${cleanAddress}`;
    // NOTE: For demo/development without a key, we'll use a public search embed
    const publicUrl = `https://maps.google.com/maps?q=${cleanAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(publicUrl);
  }

  calculateLiveMetrics() {
    if (!this.gym) return;

    // Use real member count from database if available, otherwise fallback to simulation
    this.currentOccupancy = this.gym.active_members_count !== undefined
      ? this.gym.active_members_count
      : (this.gym.members_count || 0);

    const capacity = this.gym.capacity || 200;
    const loadPercent = (this.currentOccupancy / capacity) * 100;

    if (loadPercent > 80) this.loadColor = '#ef4444';
    else if (loadPercent > 50) this.loadColor = '#f59e0b';
    else this.loadColor = '#4ade80';
  }

  getLoadPercent(): string {
    if (!this.gym) return '0%';
    return Math.round((this.currentOccupancy / (this.gym.capacity || 100)) * 100) + '%';
  }

  get loadStatus(): 'Optimal' | 'Medium' | 'High' {
    if (!this.gym) return 'Optimal';
    const percent = (this.currentOccupancy / (this.gym.capacity || 100)) * 100;
    if (percent < 40) return 'Optimal';
    if (percent < 80) return 'Medium';
    return 'High';
  }

  get isOpen(): boolean {
    if (!this.gym) return true;
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay(); // 0=Sun, 1=Mon, 6=Sat
    
    let schedule = this.gym.open_mon_fri || '06:00 - 22:00';
    if (day === 6) schedule = this.gym.open_sat || '08:00 - 20:00';
    if (day === 0) schedule = this.gym.open_sun || '08:00 - 16:00';
    
    try {
      const parts = schedule.split('-');
      if (parts.length < 2) return true;
      const start = parseInt(parts[0].trim().split(':')[0]);
      const end = parseInt(parts[1].trim().split(':')[0]);
      return hours >= start && hours < (end === 0 ? 24 : end);
    } catch (e) {
      return true;
    }
  }

  subscribe() {
    if (this.isSubscribed) {
      // Navigate to appropriate feed or dashboard
      this.router.navigate(['/member/feed']);
      return;
    }
    this.showPaymentPicker = true;
  }

  shareProfile() {
    if (navigator.share) {
      navigator.share({
        title: this.gym?.name || 'Metropolitan Hub',
        text: 'Check out this premium fitness node!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      this.showToast('Node Link Copied to Clipboard!', 'success');
    }
  }

  getNavigation() {
    this.showToast(`Initiating GPS routing to: ${this.gym?.adress || 'the facility'}...`, 'info');
  }

  processPurchase(event: any) {
    if (!this.gym?.id_gym) return;

    const method = event.method;
    const plan = event.plan;
    if (!plan) {
      this.showToast('Validation Error: No synchronization tier selected.', 'error');
      return;
    }

    this.isProcessingPayment = true;
    this.paymentError = null;

    if (method === 'zen_wallet') {
      this.memberService.purchaseMembership(this.gym.id_gym, 'zen_wallet', plan.type || plan.id, plan.id).subscribe({
        next: (res: any) => this.handlePurchaseSuccess(res),
        error: (err: any) => this.handlePurchaseError(err)
      });
    } else if (method === 'stripe' || method === 'credit_card') {
      this.memberService.createPaymentIntent(this.gym.id_gym, plan.price).subscribe({
        next: (res: any) => {
          const clientSecret = res.client_secret;
          event.stripe.confirmCardPayment(clientSecret, {
            payment_method: { card: event.card }
          }).then((result: any) => {
            if (result.error) {
              this.handlePurchaseError({ error: { message: result.error.message } });
            } else if (result.paymentIntent.status === 'succeeded') {
              this.memberService.purchaseMembership(this.gym.id_gym, 'credit_card', plan.type || plan.id, plan.id).subscribe({
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
    this.isSubscribed = true;
    this.showPaymentPicker = false;
    this.isProcessingPayment = false;
    this.showToast(res.message || 'Payment successful! Welcome to ' + this.gym.name, 'success');
    this.cdr.detectChanges();
  }

  private handlePurchaseError(err: any) {
    this.isProcessingPayment = false;
    this.paymentError = err.error?.message || 'Payment synchronization failed.';
    this.showToast(this.paymentError || 'Error', 'error');
    this.cdr.detectChanges();
  }

  switchTab(tab: 'overview' | 'training' | 'community') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // Review Protocol Logic
  openReviewModal() {
    if (!this.isSubscribed) {
      this.showToast('Node Authorization Required: You must be a member to submit a review.', 'error');
      return;
    }
    this.showReviewModal = true;
  }

  fetchReviews(id: string) {
    this.memberService.getGymReviews(id).subscribe({
      next: (res: any) => {
        this.gymReviews = res.data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.warn('Could not fetch reputation data.', err)
    });
  }

  submitRating(rating: number) {
    this.reviewData.rating = rating;
  }

  submitReview() {
    if (!this.reviewData.comment.trim()) {
      this.showToast('Verification Error: Review comment cannot be empty.', 'error');
      return;
    }

    this.isSubmittingReview = true;
    this.memberService.submitReview(this.gym.id_gym, this.reviewData).subscribe({
      next: (res: any) => {
        this.isSubmittingReview = false;
        this.showReviewModal = false;
        this.showToast('Review Protocol Synchronized Successfully!', 'success');
        this.reviewData = { rating: 5, comment: '' };

        // Immediate full-node synchronization
        this.fetchReviews(this.gym.id_gym);
      },
      error: (err: any) => {
        this.isSubmittingReview = false;
        const errorMessage = err.error?.message || 'Sync Error: Failed to publish review. Hub might be offline.';
        this.showToast(errorMessage, 'error');
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

  toggleFollow() {
    if (!this.gym) return;

    if (this.isFollowing && this.subscriptionId) {
      this.memberService.unfollowGym(this.subscriptionId).subscribe({
        next: () => {
          this.isFollowing = false;
          this.subscriptionId = undefined;
          this.showToast('Removed from following', 'info');
        },
        error: () => this.showToast('Sync Error: Failed to unfollow', 'error')
      });
    } else {
      this.memberService.followGym(this.gym.id_gym).subscribe({
        next: (res: any) => {
          this.isFollowing = true;
          this.subscriptionId = res.data?.id_subscribe;
          this.showToast('Facility Added to your Network', 'success');
        },
        error: () => this.showToast('Sync Error: Failed to follow', 'error')
      });
    }
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Handle missing 'storage/' prefix for profile pictures and other uploaded assets
    if (!cleanPath.startsWith('storage/') && !cleanPath.startsWith('assets/')) {
      cleanPath = 'storage/' + cleanPath;
    }

    return `${baseUrl}/${cleanPath}`;
  }

  getGymInitials(name?: string): string {
    if (!name) return 'GY';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }
}
