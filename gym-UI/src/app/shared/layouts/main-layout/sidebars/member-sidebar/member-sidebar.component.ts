import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MemberService } from '../../../../../features/member/services/member.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';

@Component({
  selector: 'app-member-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './member-sidebar.component.html',
  styleUrl: './member-sidebar.component.scss'
})
export class MemberSidebarComponent {
  private authService = inject(AuthService);
  private memberService = inject(MemberService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);

  showSupportModal = signal(false);
  supportMessage = signal('');
  isSubmittingSupport = signal(false);

  navItems = [
    { label: 'Overview', isHeader: true },
    { label: 'Dashboard', icon: 'dashboard', routePath: '/member/dashboard' },
    { label: 'Live Feed', icon: 'feed', routePath: '/member/feed' },
    { label: 'Notifications', icon: 'bell', routePath: '/notifications' },

    { label: 'My Training', isHeader: true },
    { label: 'Workouts', icon: 'calendar', routePath: '/member/workouts' },
    { label: 'Health', isHeader: true },
    { label: 'Nutrition', icon: 'food', routePath: '/member/nutrition' },
    { label: 'Progress', icon: 'trending-up', routePath: '/member/progress' },

    { label: 'Marketplace', isHeader: true },
    { label: 'Gyms Hub', icon: 'users', routePath: '/member/gyms' },
    { label: 'Memberships', icon: 'users', routePath: '/member/subscriptions' },
    { label: 'Training Hub', icon: 'book', routePath: '/member/courses' },
    { label: 'Events Hub', icon: 'calendar', routePath: '/member/events' },
    { label: 'Marketplace', icon: 'shop', routePath: '/member/products' },
    { label: 'My Purchases', icon: 'receipt', routePath: '/member/purchases' },
    { label: 'Settings', isHeader: true },
    { label: 'Account Settings', icon: 'settings', routePath: '/member/settings' }
  ];

  openSupportModal() {
    this.supportMessage.set('');
    this.showSupportModal.set(true);
  }

  closeSupportModal() {
    this.showSupportModal.set(false);
  }

  submitSupportRequest() {
    if (!this.supportMessage().trim()) return;

    this.isSubmittingSupport.set(true);
    this.notificationService.contactSupport(this.supportMessage()).subscribe({
      next: (res: any) => {
        this.isSubmittingSupport.set(false);
        this.showSupportModal.set(false);
        this.toastService.success(res.message || 'Support request sent successfully.');
      },
      error: (err: any) => {
        this.isSubmittingSupport.set(false);
        this.toastService.error(err.error?.message || 'Failed to send support request.');
      }
    });
  }

  getIcon(name: string): SafeHtml {
    const icons: { [key: string]: string } = {
      dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      fitness: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h4"></path><path d="M14 18h4"></path><path d="M15 22v-4"></path><path d="M9 22v-4"></path><path d="M15 14v-4"></path><path d="M9 14v-4"></path><path d="M11 6v-2h2v2"></path><path d="M5 10v4h14v-4H5z"></path></svg>`,
      calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      food: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
      users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
      'trending-up': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
      book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 20H20v22H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
      feed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"></path><circle cx="12" cy="12" r="2"></circle></svg>`,
      shop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
      receipt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"></path><path d="M16 8h-6"></path><path d="M16 12h-9"></path><path d="M10 16h6"></path></svg>`
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[name] || '');
  }
}
