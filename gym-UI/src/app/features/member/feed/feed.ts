import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { AuthService } from '../../../core/services/auth.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { forkJoin, interval, Subscription, startWith, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ActivityNode {
  id?: string;
  id_gym?: string;
  type: 'EVENT' | 'COURSE' | 'PRODUCT' | 'NUTRITION_PLAN' | 'MEMBERSHIP';
  gymName: string;
  title: string;
  content: string;
  price?: number;
  time: string;
  timestamp: number;
  icon: string;
  color: string;
  image: string;
  liked?: boolean;
  likesCount?: number;
  commentsCount?: number;
}

@Component({
  selector: 'app-member-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
  animations: [
    trigger('staggerFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.6s cubic-bezier(0.23, 1, 0.32, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class FeedComponent implements OnInit, OnDestroy {
  private memberService = inject(MemberService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  activities: ActivityNode[] = [];
  loading = true;
  activeSubscription: any = null;
  private pollingSubscription?: Subscription;

  // Asset mapping for visual flair
  private typeAssets: any = {
      'EVENT': 'gym_feed_event_hero_1776958220264.png',
      'COURSE': 'gym_feed_course_hero_1776958262282.png',
      'PRODUCT': 'gym_product_hero.png',
      'NUTRITION_PLAN': 'gym_nutrition_plan_hero.png',
      'MEMBERSHIP': 'gym_feed_event_hero_1776958220264.png' // Fallback
  };

  ngOnInit(): void {
      this.startLiveSync();
  }

  ngOnDestroy(): void {
      this.pollingSubscription?.unsubscribe();
  }

  private startLiveSync(): void {
    this.pollingSubscription = interval(60000) // Poll every 60 seconds
      .pipe(
        startWith(0),
        switchMap(() => {
          if (this.activities.length === 0) this.loading = true;
          
          return forkJoin({
            events: this.memberService.getEvents(),
            courses: this.memberService.getAvailableCourses(),
            products: this.memberService.getProducts(),
            nutritionPlans: this.memberService.getMyNutritionPlansMarketplace(),
            subscriptions: this.memberService.getMySubscriptions()
          });
        })
      )
      .subscribe({
        next: (data: any) => this.processFeedData(data),
        error: (err) => {
          console.error('LIVE SYNC Error:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private processFeedData(data: any): void {
    const feedItems: ActivityNode[] = [];
    
    // Extract IDs of gyms the user is subscribed to
    const subscribedGymIds = new Set(data.subscriptions?.data?.map((sub: any) => sub.id_gym).filter(Boolean) || []);
    
    // 1. Process Events (Filtered by subscription)
    if (data.events?.data) {
        data.events.data.forEach((evt: any) => {
            if (subscribedGymIds.has(evt.id_gym)) {
                feedItems.push({
                    id: evt.id_event,
                    id_gym: evt.id_gym,
                    type: 'EVENT',
                    gymName: evt.gym?.name || 'Partner Facility',
                    title: evt.title || 'Elite Fitness Event',
                    content: evt.description || 'Join us for an exclusive training workshop.',
                    time: this.formatRelativeTime(evt.created_at || evt.start_date),
                    timestamp: new Date(evt.created_at || evt.start_date).getTime(),
                    icon: 'event',
                    color: '#f43f5e',
                    image: this.getImageUrl(evt.image, 'EVENT'),
                    liked: evt.is_liked,
                    likesCount: evt.likes_count || 0,
                    commentsCount: evt.comments_count || 0
                });
            }
        });
    }

    // 2. Process Courses (Filtered by subscription)
    if (data.courses?.data) {
        data.courses.data.forEach((crs: any) => {
            if (subscribedGymIds.has(crs.id_gym)) {
                feedItems.push({
                    id: crs.id_course,
                    id_gym: crs.id_gym,
                    type: 'COURSE',
                    gymName: crs.gym?.name || 'Training Center',
                    title: `New Course: ${crs.name}`,
                    content: crs.description || 'Level up your skills with our professional trainers.',
                    price: crs.price,
                    time: this.formatRelativeTime(crs.created_at),
                    timestamp: new Date(crs.created_at).getTime(),
                    icon: 'school',
                    color: '#0ea5e9',
                    image: this.getImageUrl(crs.image, 'COURSE'),
                    liked: crs.is_liked,
                    likesCount: crs.likes_count || 0,
                    commentsCount: crs.comments_count || 0
                });
            }
        });
    }

    // 3. Process Products (Filtered by subscription)
    if (data.products?.data) {
        data.products.data.forEach((prod: any) => {
            if (subscribedGymIds.has(prod.id_gym)) {
                feedItems.push({
                    id: prod.id_product,
                    id_gym: prod.id_gym,
                    type: 'PRODUCT',
                    gymName: prod.gym?.name || 'Elite Shop',
                    title: `New Arrival: ${prod.name}`,
                    content: `Premium quality fitness gear now available. Only ${prod.price} credits.`,
                    price: prod.price,
                    time: this.formatRelativeTime(prod.created_at),
                    timestamp: new Date(prod.created_at).getTime(),
                    icon: 'shopping_bag',
                    color: '#10b981',
                    image: this.getImageUrl(prod.image, 'PRODUCT'),
                    liked: prod.is_liked,
                    likesCount: prod.likes_count || 0,
                    commentsCount: prod.comments_count || 0
                });
            }
        });
    }

    // 4. Process Nutrition Plans (Filtered by subscription)
    if (data.nutritionPlans?.data) {
        data.nutritionPlans.data.forEach((plan: any) => {
            if (subscribedGymIds.has(plan.id_gym)) {
                feedItems.push({
                    id: plan.id_plan,
                    id_gym: plan.id_gym,
                    type: 'NUTRITION_PLAN',
                    gymName: plan.gym?.name || 'Bio-Sync Lab',
                    title: `Protocol Released: ${plan.title || plan.name}`,
                    content: plan.description || 'Optimized clinical nutrition protocol for elite metabolism.',
                    price: plan.price,
                    time: this.formatRelativeTime(plan.created_at),
                    timestamp: new Date(plan.created_at).getTime(),
                    icon: 'restaurant',
                    color: '#8b5cf6',
                    image: this.getImageUrl(plan.image, 'NUTRITION_PLAN'),
                    liked: plan.is_liked,
                    likesCount: plan.likes_count || 0,
                    commentsCount: plan.comments_count || 0
                });
            }
        });
    }

    // 5. Process Memberships (New Subscriptions)
    if (data.subscriptions?.data) {
        data.subscriptions.data.forEach((sub: any) => {
            const planName = sub.plan?.name || 'Standard Access';
            feedItems.push({
                id: sub.id_subscribe,
                id_gym: sub.id_gym,
                type: 'MEMBERSHIP',
                gymName: sub.gym?.name || 'Local Facility',
                title: `Membership Activated: ${planName}`,
                content: `Protocol established with ${sub.gym?.name}. Your ${planName} membership is now active and synchronized with the Zenith Network.`,
                time: this.formatRelativeTime(sub.created_at || sub.subscribe_date),
                timestamp: new Date(sub.created_at || sub.subscribe_date || Date.now()).getTime(),
                icon: 'verified_user',
                color: '#f59e0b',
                image: this.getAssetUrl('MEMBERSHIP'),
                liked: sub.is_liked,
                likesCount: sub.likes_count || 0,
                commentsCount: sub.comments_count || 0
            });
        });
    }

    this.activities = feedItems.sort((a, b) => b.timestamp - a.timestamp);
    this.loading = false;
    this.cdr.detectChanges();
  }

  loadRealFeed(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.startLiveSync();
  }

  private getAssetUrl(type: string): string {
      const fileName = this.typeAssets[type];
      return `assets/images/hub/${fileName}`; 
  }

  private getImageUrl(path: string | null | undefined, defaultType: string): string {
    if (!path) return this.getAssetUrl(defaultType);
    if (path.startsWith('http')) return path;
    
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  private formatRelativeTime(dateStr: string): string {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  // Modal State
  activeModalAct: any = null;
  modalMode: 'comment' | 'details' = 'details';
  currentComments: any[] = [];
  commentsLoading = false;

  // Toast Notification State
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

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

  // Interactive Actions
  likePulse(act: ActivityNode): void {
    if (!act.id) return;
    
    this.memberService.toggleLike(act.id, act.type).subscribe({
      next: (res) => {
        act.liked = res.liked;
        // Optimistically update count
        if (act.liked) {
          act.likesCount = (act.likesCount || 0) + 1;
        } else {
          act.likesCount = Math.max(0, (act.likesCount || 1) - 1);
        }
        this.showToast(res.liked ? 'Pulse favorited. Synced to preferences.' : 'Pulse removed from favorites.', res.liked ? 'success' : 'info');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Failed to sync network status.', 'error')
    });
  }

  commentPulse(act: ActivityNode): void {
    this.activeModalAct = act;
    this.modalMode = 'comment';
    this.loadComments(act);
  }

  loadComments(act: ActivityNode): void {
    if (!act.id) return;
    this.commentsLoading = true;
    this.memberService.getComments(act.id, act.type).subscribe({
      next: (res) => {
        this.currentComments = res.data;
        this.commentsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.commentsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  submitComment(text: string): void {
    if (!text.trim() || !this.activeModalAct?.id) {
        this.showToast('Transmission cannot be empty.', 'error');
        return;
    }
    
    this.memberService.addComment(this.activeModalAct.id, this.activeModalAct.type, text).subscribe({
      next: (res) => {
        this.showToast('Transmission successfully broadcasted to the Network.', 'success');
        this.activeModalAct.commentsCount = (this.activeModalAct.commentsCount || 0) + 1;
        this.loadComments(this.activeModalAct); // Refresh list
        this.cdr.detectChanges();
        // Clear input would be nice but it's a template ref
      },
      error: () => this.showToast('Broadcasting failed. System offline.', 'error')
    });
  }

  sharePulse(act: any): void {
    if (navigator.share) {
        navigator.share({
            title: act.title,
            text: act.content,
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(`${window.location.origin}/member/feed?id=${act.id}&type=${act.type}`);
        this.showToast('Transmission link copied to clipboard.', 'success');
    }
  }

  viewDetails(act: ActivityNode): void {
    this.activeModalAct = act;
    this.modalMode = 'details';
    this.loadComments(act);
  }

  navigateToGym(gymId: string | undefined): void {
    if (!gymId) return;
    this.router.navigate(['/member/gyms', gymId]);
  }

  closeModal(): void {
    this.activeModalAct = null;
    this.currentComments = [];
  }
}

