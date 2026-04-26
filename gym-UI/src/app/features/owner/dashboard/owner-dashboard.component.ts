import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OwnerDashboardService } from '../services/owner-dashboard.service';
import { DashboardStatsComponent } from './components/dashboard-stats/dashboard-stats';
import { RevenueChartComponent } from './components/revenue-chart/revenue-chart';
import { RecentCheckinsComponent } from './components/recent-checkins/recent-checkins';
import { AddMemberModalComponent } from './components/add-member-modal/add-member-modal';
import { finalize } from 'rxjs/operators';

import { DashboardData, UpcomingSession, InventoryAlert, ExpiringMembership, Checkin, FocusArea, StaffSnapshotMember } from '../../../shared/models/dashboard.model';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DashboardStatsComponent,
    RevenueChartComponent,
    RecentCheckinsComponent,
    AddMemberModalComponent
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.scss'
})
export class OwnerDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(OwnerDashboardService);

  ownerName = (this.authService.currentUser() as any)?.name || 'Owner';
  currentDate = new Date();
  showMemberModal = signal<boolean>(false);

  isLoading = signal<boolean>(true);
  stats = signal<any>(null);
  recentCheckins = signal<Checkin[]>([]);

  upcomingSessions = signal<UpcomingSession[]>([]);
  inventoryAlerts = signal<InventoryAlert[]>([]);
  expiringMemberships = signal<ExpiringMembership[]>([]);
  focusAreas = signal<FocusArea[]>([]);
  staffSnapshot = signal<StaffSnapshotMember[]>([]);


  ngOnInit() {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.isLoading.set(true);

    // Fetch Main Stats payload
    this.dashboardService.getDashboardData()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.stats.set(data.stats);
          this.upcomingSessions.set(data.upcomingSessions || []);
          this.inventoryAlerts.set(data.inventoryAlerts || []);
          this.expiringMemberships.set(data.expiringMemberships || []);
          this.focusAreas.set(data.focusAreas || []);
          this.staffSnapshot.set(data.staffSnapshot || []);

        }
      });

    // Fetch Checkins payload
    this.dashboardService.getRecentCheckins().subscribe({
      next: (data) => this.recentCheckins.set(data || [])
    });
  }
}

