import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { OwnerSidebarComponent } from './sidebars/owner-sidebar/owner-sidebar.component';
import { MemberSidebarComponent } from './sidebars/member-sidebar/member-sidebar.component';
import { AdminSidebarComponent } from './sidebars/admin-sidebar/admin-sidebar.component';
import { NutritionistSidebarComponent } from './sidebars/nutritionist-sidebar/nutritionist-sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    HeaderComponent, 
    OwnerSidebarComponent, 
    MemberSidebarComponent,
    AdminSidebarComponent,
    NutritionistSidebarComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);

  userRole = this.authService.userRole;

  constructor() {
    // When role is admin, ensure we are in a premium dark experience for the features
    effect(() => {
      const role = this.userRole();
      if (role === 'super_admin' || role === 'admin') {
        document.documentElement.classList.add('dark');
      } else {
        if (!this.themeService.darkMode()) {
          document.documentElement.classList.remove('dark');
        }
      }
    });
  }
}
