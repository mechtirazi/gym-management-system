import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { OwnerSidebarComponent } from './sidebars/owner-sidebar/owner-sidebar.component';
import { MemberSidebarComponent } from './sidebars/member-sidebar/member-sidebar.component';
import { AdminSidebarComponent } from './sidebars/admin-sidebar/admin-sidebar.component';
import { NutritionistSidebarComponent } from './sidebars/nutritionist-sidebar/nutritionist-sidebar.component';
import { ReceptionistSidebarComponent } from './sidebars/receptionist-sidebar/receptionist-sidebar.component';
import { TrainerSidebarComponent } from './sidebars/trainer-sidebar/trainer-sidebar.component';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { filter } from 'rxjs/operators';

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
    NutritionistSidebarComponent,
    ReceptionistSidebarComponent,
    TrainerSidebarComponent,
    MatIconModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  sidebarService = inject(SidebarService);

  userRole = this.authService.userRole;
  gymStatus = this.authService.connectedGymStatus;
  suspensionReason = this.authService.connectedGymSuspensionReason;

  constructor() {
    // Close sidebar on navigation (mobile UX)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.sidebarService.close());
  }

  closeSidebar() {
    this.sidebarService.close();
  }

  shouldShowSuspensionBanner = () => {
    const role = this.userRole();
    return ['owner', 'trainer', 'nutritionist', 'receptionist'].includes(role || '') && this.gymStatus() === 'suspended';
  };

  refreshGymStatus() {
    this.authService.checkCurrentGymStatus();
  }

  suspensionBannerTitle = () => {
    const role = this.userRole();
    return role === 'owner' ? 'Administrative Action Required' : 'Limited Access Enabled';
  };
}
