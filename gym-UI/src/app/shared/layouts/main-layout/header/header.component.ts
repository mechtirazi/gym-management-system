import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Router } from '@angular/router';
import { StaffService } from '../../../../features/owner/staff/services/staff.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LanguageService, AppLanguage } from '../../../../core/services/language.service';

import { FormsModule } from '@angular/forms';
import { MemberService } from '../../../../features/member/services/member.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, FormsModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private memberService = inject(MemberService);
  private staffService = inject(StaffService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);

  currentUser = this.authService.currentUser;
  isDarkMode = this.themeService.darkMode;
  showNotifications = signal(false);
  showLangDropdown = signal(false);
  showGymSwitcher = signal(false);
  currentLang = this.languageService.currentLanguage;
  searchTerm = signal('');
  
  // Real-time suggestions from API
  suggestions = signal<any[]>([]);

  onSearchInput(event: any) {
    const term = event.target.value;
    this.searchTerm.set(term);
    
    if (term.length >= 2) {
      this.memberService.searchResources(term).subscribe(res => {
        if (res.success) {
          this.suggestions.set(res.data);
        }
      });
    } else {
      this.suggestions.set([]);
    }
  }

  myGyms = this.authService.myGyms;
  connectedGymId = this.authService.connectedGymId;

  // Use the notification service's signals
  notifications = this.notificationService.unreadNotifications;
  hasUnread = this.notificationService.hasUnread;

  isImpersonating = this.authService.isImpersonating;

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  onSearch(): void {
    const term = this.searchTerm().trim();
    if (!term) return;

    const firstMatch = this.suggestions()[0];
    if (firstMatch) {
      this.selectSuggestion(firstMatch);
    } else {
      this.snackBar.open(
        this.t('HEADER.SEARCHING_FOR', { term }),
        this.t('HEADER.SNACKBAR_SYNC'),
        { duration: 2000 }
      );
    }
  }

  selectSuggestion(item: any): void {
    this.searchTerm.set('');
    this.suggestions.set([]);
    this.router.navigate([item.route]);
    this.snackBar.open(
      this.t('HEADER.NAVIGATING_TO', { name: item.name }),
      this.t('HEADER.SNACKBAR_SUCCESS'),
      { duration: 2000 }
    );
  }

  viewAllNotifications(): void {
    this.showNotifications.set(false);
    this.router.navigate(['/notifications']);
  }

  toggleLangDropdown(): void {
    this.showLangDropdown.update(v => !v);
  }

  setLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
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
        this.snackBar.open(
          this.t('HEADER.INVITATION_ACCEPTED'),
          this.t('HEADER.SNACKBAR_AWESOME'),
          { duration: 3000 }
        );
        this.notificationService.fetchNotifications().subscribe();
        
        // Reload context so the user instantly gains access to the relevant sidebars and routes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
      error: () =>
        this.snackBar.open(
          this.t('HEADER.INVITATION_FAILED'),
          this.t('HEADER.SNACKBAR_CLOSE'),
          { duration: 3000 }
        )
    });
  }

  declineInvite(notif: any): void {
    this.staffService.declineInvitation(notif.id).subscribe({
      next: () => {
        this.snackBar.open(
          this.t('HEADER.INVITATION_DECLINED'),
          this.t('HEADER.SNACKBAR_CLOSE'),
          { duration: 3000 }
        );
        this.notificationService.fetchNotifications().subscribe();
      }
    });
  }

  private t(key: string, params?: Record<string, unknown>): string {
    const translated = this.translate.instant(key, params);
    return typeof translated === 'string' ? translated : key;
  }
}
