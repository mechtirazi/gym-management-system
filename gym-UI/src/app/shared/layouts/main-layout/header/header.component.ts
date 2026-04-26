import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Router } from '@angular/router';
import { StaffService } from '../../../../features/owner/staff/services/staff.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private staffService = inject(StaffService);
  private snackBar = inject(MatSnackBar);

  currentUser = this.authService.currentUser;
  isDarkMode = this.themeService.darkMode;
  showNotifications = signal(false);
  showLangDropdown = signal(false);
  showGymSwitcher = signal(false);
  currentLang = signal<'en' | 'fr'>('en');

  myGyms = this.authService.myGyms;
  connectedGymId = this.authService.connectedGymId;

  // Use the notification service's signals
  notifications = this.notificationService.unreadNotifications;
  hasUnread = this.notificationService.hasUnread;

  isImpersonating = this.authService.isImpersonating;

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  viewAllNotifications(): void {
    this.showNotifications.set(false);
    this.router.navigate(['/notifications']);
  }

  toggleLangDropdown(): void {
    this.showLangDropdown.update(v => !v);
  }

  setLanguage(lang: 'en' | 'fr'): void {
    this.currentLang.set(lang);
    this.showLangDropdown.set(false);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  getAvatarUrl(path?: string): string {
    return this.authService.getAvatarUrl(path);
  }

  logout(): void {
    this.authService.logout();
  }

  stopImpersonation(): void {
    this.authService.stopImpersonation();
  }

  toggleGymSwitcher(): void {
    this.showGymSwitcher.update(v => !v);
  }

  switchGym(id: string | number): void {
    this.authService.switchGym(id);
    this.showGymSwitcher.set(false);
  }

  acceptInvite(notif: any): void {
    const parts = notif.type?.split(':');
    if (!parts || parts.length < 3) return;

    const gymId = parts[1];
    const role = parts[2];
    
    const payload = {
      id_notification: notif.id,
      id_gym: gymId,
      role: role
    };

    this.staffService.joinGym(payload).subscribe({
      next: () => {
        this.snackBar.open('Invitation accepted! Welcome.', 'Awesome', { duration: 3000 });
        this.notificationService.fetchNotifications().subscribe();
        
        // Reload context so the user instantly gains access to the relevant sidebars and routes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
      error: () => this.snackBar.open('Failed to join gym.', 'Close', { duration: 3000 })
    });
  }

  declineInvite(notif: any): void {
    this.staffService.declineInvitation(notif.id).subscribe({
      next: () => {
        this.snackBar.open('Invitation declined.', 'Close', { duration: 3000 });
        this.notificationService.fetchNotifications().subscribe();
      }
    });
  }
}
