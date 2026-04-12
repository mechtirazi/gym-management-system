import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MemberService } from '../services/member.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-member-gym-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
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
  gymReviews: any[] = [];

  // Toast Notification State
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  // Real-time Simulation Data
  currentOccupancy = 0;
  loadColor = '#4ade80';
  todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Mon, 6=Sun

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
      mySubs: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (res: any) => {
        // Find specific gym
        const gyms = Array.isArray(res.allGyms.data) ? res.allGyms.data : (res.allGyms.data?.data || []);
        this.gym = gyms.find((g: any) => g.id_gym === id) || gyms[0];

        // Find courses for this gym (Filtering by gym_id if present)
        const allCourses = res.allCourses.data?.data || res.allCourses.data || [];
        this.courses = allCourses.filter((c: any) => c.gym_id === id).slice(0, 4);

        // Final fallback if no courses linked directly (Mocking data for complete look in this demo)
        if (this.courses.length === 0) {
          this.courses = [
            { name: 'Metabolic Shred', icon: 'bolt', level: 'Advanced' },
            { name: 'Mind-Muscle Connection', icon: 'psychology', level: 'Intermediate' },
            { name: '45-Min Recovery Flow', icon: 'spa', level: 'All Levels' }
          ];
        }

        // Check subscription status
        const mySubs = res.mySubs.data || [];
        this.isSubscribed = mySubs.some((s: any) => s.gym_id === id);

        // Simulation of live metrics
        this.calculateLiveMetrics();

        // Generate Dynamic Map Hub
        this.generateMapUrl();

        this.loading = false;
        this.cdr.detectChanges();
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
    const capacity = this.gym.capacity || 200;
    // Generate a semi-realistic occupancy based on capacity
    this.currentOccupancy = Math.floor(Math.random() * (capacity * 0.9));
    const loadPercent = (this.currentOccupancy / capacity) * 100;

    if (loadPercent > 80) this.loadColor = '#ef4444';
    else if (loadPercent > 50) this.loadColor = '#f59e0b';
    else this.loadColor = '#4ade80';
  }

  getLoadPercent(): string {
    if (!this.gym) return '0%';
    return Math.round((this.currentOccupancy / (this.gym.capacity || 100)) * 100) + '%';
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

  processPurchase(method: 'zen_wallet' | 'credit_card') {
    if (!this.gym?.id_gym) return;

    this.isProcessingPayment = true;
    this.memberService.purchaseMembership(this.gym.id_gym, method).subscribe({
      next: (res: any) => {
        this.isSubscribed = true;
        this.showPaymentPicker = false;
        this.isProcessingPayment = false;
        this.showToast(res.message || 'Payment successful! Welcome to ' + this.gym.name, 'success');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isProcessingPayment = false;
        this.showToast(err.error?.message || 'Payment synchronization failed. Check your credits.', 'error');
        this.cdr.detectChanges();
      }
    });
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
        // In a real app, we'd reload the reviews list here
      },
      error: (err: any) => {
        this.isSubmittingReview = false;
        this.showToast('Sync Error: Failed to publish review. Hub might be offline.', 'error');
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
