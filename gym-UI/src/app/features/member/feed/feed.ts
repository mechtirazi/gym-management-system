import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { AuthService } from '../../../core/services/auth.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { forkJoin, interval, Subscription, startWith, switchMap } from 'rxjs';

export interface ActivityNode {
  type: 'ANNOUNCEMENT' | 'MEMBERSHIP' | 'TRAINING';
  gymName: string;
  title: string;
  content: string;
  time: string;
  timestamp: number;
  icon: string;
  color: string;
  image: string;
  liked?: boolean;
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

  activities: ActivityNode[] = [];
  loading = true;
  activeSubscription: any = null;
  private pollingSubscription?: Subscription;

  // Asset mapping for visual flair
  private typeAssets: any = {
      'ANNOUNCEMENT': 'gym_announcement_hero_1775321952779.png',
      'MEMBERSHIP': 'gym_membership_node_activation_1775322074080.png',
      'TRAINING': 'gym_training_session_live_1775322089499.png'
  };

  ngOnInit(): void {
      this.startLiveSync();
  }

  ngOnDestroy(): void {
      this.pollingSubscription?.unsubscribe();
  }

  private startLiveSync(): void {
    // Poll every 30 seconds
    this.pollingSubscription = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => {
          // If it's the first load, show skeleton
          if (this.activities.length === 0) this.loading = true;
          
          return forkJoin({
            notifications: this.memberService.getNotifications(),
            subscriptions: this.memberService.getMySubscriptions(),
            attendances: this.memberService.getMyAttendances()
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
    
    const subs = data.subscriptions?.data || [];
    this.activeSubscription = subs.find((s: any) => s.status?.toLowerCase() === 'active');

    // 1. Process Announcements
    if (data.notifications?.data) {
        data.notifications.data.forEach((note: any) => {
            feedItems.push({
                type: 'ANNOUNCEMENT',
                gymName: 'System Hub',
                title: note?.title || 'Broadcast Pulse',
                content: note?.text || note?.message || 'New update from the network.',
                time: this.formatRelativeTime(note?.created_at),
                timestamp: new Date(note?.created_at).getTime(),
                icon: 'campaign',
                color: '#8b5cf6',
                image: this.getAssetUrl('ANNOUNCEMENT')
            });
        });
    }

    // 2. Process Memberships
    if (data.subscriptions?.data) {
        data.subscriptions.data.forEach((sub: any) => {
            feedItems.push({
                type: 'MEMBERSHIP',
                gymName: sub.gym?.name || 'Local Facility',
                title: `Network Node Activated`,
                content: `Your ${sub.status || 'active'} membership node is now live at ${sub.gym?.name || 'Local Facility'}. Synchronizing training protocols.`,
                time: this.formatRelativeTime(sub.subscribe_date || sub.created_at),
                timestamp: new Date(sub.subscribe_date || sub.created_at).getTime(),
                icon: 'bolt',
                color: '#10b981',
                image: this.getAssetUrl('MEMBERSHIP')
            });
        });
    }

    // 3. Process Attendances (Training)
    if (data.attendances?.data) {
        data.attendances.data.forEach((check: any) => {
            // Using logic fallbacks for data consistency
            const gymName = check.gym_name || check.session?.course?.gym?.name || 'Regional Hub';
            const courseName = check.course_name || check.session?.course?.name || 'General Training';
            
            feedItems.push({
                type: 'TRAINING',
                gymName: gymName,
                title: 'Biometric Check-in Confirmed',
                content: `System synchronized at ${gymName} for training in ${courseName}.`,
                time: this.formatRelativeTime(check.created_at),
                timestamp: new Date(check.created_at).getTime(),
                icon: 'fitness_center',
                color: '#0ea5e9',
                image: this.getAssetUrl('TRAINING')
            });
        });
    }

    this.activities = feedItems.sort((a, b) => b.timestamp - a.timestamp);
    this.loading = false;
    this.cdr.detectChanges();
  }

  loadRealFeed(): void {
    // Manual sync trigger
    this.loading = true;
    this.cdr.detectChanges();
    this.startLiveSync();
  }

  private getAssetUrl(type: string): string {
      const fileName = this.typeAssets[type];
      return `assets/images/hub/${fileName}`; 
  }

  private formatRelativeTime(dateStr: string): string {
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
  likePulse(act: any): void {
    act.liked = !act.liked;
    if (act.liked) {
      this.showToast(`Pulse favorited. Synced to preferences.`, 'success');
    } else {
      this.showToast(`Pulse removed from favorites.`, 'info');
    }
  }

  commentPulse(act: any): void {
    this.activeModalAct = act;
    this.modalMode = 'comment';
  }

  submitComment(text: string): void {
    if (!text.trim()) {
        this.showToast('Transmission cannot be empty.', 'error');
        return;
    }
    this.showToast('Transmission successfully broadcasted to the Network.', 'success');
    this.closeModal();
  }

  sharePulse(act: any): void {
    if (navigator.share) {
        navigator.share({
            title: act.title,
            text: act.content,
        }).catch(console.error);
    } else {
        this.showToast('Transmission link copied to clipboard.', 'success');
    }
  }

  viewDetails(act: any): void {
    this.activeModalAct = act;
    this.modalMode = 'details';
  }

  closeModal(): void {
    this.activeModalAct = null;
  }
}

