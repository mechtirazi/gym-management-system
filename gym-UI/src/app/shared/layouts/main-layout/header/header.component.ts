import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isDarkMode = this.themeService.darkMode;
  showNotifications = signal(false);
  showLangDropdown = signal(false);
  currentLang = signal<'en' | 'fr'>('en');

  // Use the notification service's signals
  notifications = this.notificationService.notifications;
  hasUnread = this.notificationService.hasUnread;

  isImpersonating = signal(!!localStorage.getItem('original_user'));

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
}
