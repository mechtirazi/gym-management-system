import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { GymService, GymInfo } from '../../../../../core/services/gym.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { signal, OnInit } from '@angular/core';

@Component({
  selector: 'app-trainer-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './trainer-sidebar.component.html',
  styleUrl: './trainer-sidebar.component.scss'
})
export class TrainerSidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private gymService = inject(GymService);
  private sanitizer = inject(DomSanitizer);

  assignedGyms = signal<GymInfo[]>([]);
  activeGymId = this.authService.connectedGymId;

  navItems = [
    { label: 'Overview', isHeader: true },
    { label: 'Dashboard', icon: 'dashboard', routePath: '/trainer/dashboard' },

    { label: 'Coaching', isHeader: true },
    { label: 'Sessions', icon: 'clock', routePath: '/trainer/sessions' },
    { label: 'Clients', icon: 'users', routePath: '/trainer/members' },
    { label: 'Courses', icon: 'fitness_center', routePath: '/trainer/courses' },

    { label: 'Planning', isHeader: true },
    { label: 'Calendar', icon: 'calendar', routePath: '/trainer/calendar' },
    { label: 'Community', icon: 'star', routePath: '/trainer/community' },

    { label: 'System', isHeader: true },
    { label: 'Analytics', icon: 'trending-up', routePath: '/trainer/analytics' },
    { label: 'Notifications', icon: 'bell', routePath: '/notifications' },
    { label: 'Settings', icon: 'settings', routePath: '/settings' }
  ];

  ngOnInit() {
    this.loadAssignedGyms();
  }

  loadAssignedGyms() {
    this.gymService.getMyGyms().subscribe(gyms => {
      this.assignedGyms.set(gyms);
    });
  }

  onGymChange(event: any) {
    const gymId = event.target.value;
    if (gymId) {
      const selectedGym = this.assignedGyms().find(g => g.id_gym === gymId);
      this.authService.switchGym(gymId, selectedGym?.status, selectedGym?.suspension_reason);
    }
  }

  getIcon(name: string): SafeHtml {
    const icons: { [key: string]: string } = {
      dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
      calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      fitness_center: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7.5V16.5M18 7.5V16.5M6 12H18M3 9V15M21 9V15" stroke-width="2.5"/></svg>`,
      food: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8a7 7 0 0 1-9 10Z"></path><path d="M11 20L11 12"></path></svg>`,
      star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
      'trending-up': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
      bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[name] || '');
  }
}
