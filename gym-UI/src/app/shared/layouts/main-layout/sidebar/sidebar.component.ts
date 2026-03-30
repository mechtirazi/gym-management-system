import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private authService = inject(AuthService);

  userRole = this.authService.userRole;

  private allNavItems = [
    // Common items
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['admin', 'staff', 'member', 'owner'] },

    // Owner specific items
    { label: 'My Gym', icon: 'gym', route: '/owner/gym-profile', roles: ['owner'] },
    { label: 'Trainers', icon: 'fitness', route: '/owner/trainers', roles: ['owner', 'admin'] },
    { label: 'Members', icon: 'users', route: '/owner/members', roles: ['owner', 'staff', 'admin'] },
    { label: 'Memberships', icon: 'card', route: '/owner/memberships', roles: ['owner', 'admin'] },
    { label: 'Equipment', icon: 'settings', route: '/owner/equipment', roles: ['owner'] },
    { label: 'Revenue', icon: 'revenue', route: '/owner/revenue', roles: ['owner', 'admin'] },

    // Member specific items
    { label: 'My Workouts', icon: 'calendar', route: '/member/workouts', roles: ['member'] },
    { label: 'Exercises', icon: 'fitness', route: '/exercises', roles: ['member', 'staff'] },
    { label: 'Nutrition', icon: 'food', route: '/nutrition', roles: ['member'] },

    // Admin specific items
    { label: 'Gyms Management', icon: 'gym', route: '/admin/gyms', roles: ['admin'] },
    { label: 'System Logs', icon: 'settings', route: '/admin/logs', roles: ['admin'] },

    // Shared
    { label: 'Community', icon: 'users', route: '/community', roles: ['admin', 'staff', 'member', 'owner'] },
    { label: 'Settings', icon: 'settings', route: '/settings', roles: ['admin', 'staff', 'member', 'owner'] }
  ];

  navItems = computed(() => {
    const role = this.userRole();
    return this.allNavItems.filter(item => !role || item.roles.includes(role));
  });

  getIcon(name: string): string {
    const icons: { [key: string]: string } = {
      dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      fitness: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h4"></path><path d="M14 18h4"></path><path d="M15 22v-4"></path><path d="M9 22v-4"></path><path d="M15 14v-4"></path><path d="M9 14v-4"></path><path d="M11 6v-2h2v2"></path><path d="M5 10v4h14v-4H5z"></path></svg>`,
      gym: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3"></path><path d="M3 11h3a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1z"></path><path d="M7 11h10"></path><path d="M7 16h10"></path><path d="M17 11v5"></path><path d="M7 11v5"></path></svg>`,
      calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      food: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
      users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,
      revenue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
      settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
    };
    return icons[name] || '';
  }
}
