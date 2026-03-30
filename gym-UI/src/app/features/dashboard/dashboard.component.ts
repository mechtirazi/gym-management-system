import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { OwnerDashboardService } from '../owner/services/owner-dashboard.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private dashboardService = inject(OwnerDashboardService);

  isLoadingStats = signal<boolean>(true);
  stats = signal<any[]>([]);

  ngOnInit() {
    this.fetchDashboardStats();
  }

  fetchDashboardStats() {
    this.isLoadingStats.set(true);
    this.dashboardService.getDashboardData()
      .pipe(finalize(() => this.isLoadingStats.set(false)))
      .subscribe({
        next: (data) => {
          const userRole = this.authService.userRole();
          if (userRole === 'owner') {
             this.stats.set([
              { label: 'Total Revenue', value: `${data.stats.totalRevenue.toLocaleString()} DT`, trend: `${data.stats.revenueTrend > 0 ? '+' : ''}${data.stats.revenueTrend}%`, isPositive: data.stats.revenueTrend >= 0, color: 'indigo' },
              { label: 'Active Members', value: data.stats.activeMembers.toLocaleString(), trend: `${data.stats.membersTrend > 0 ? '+' : ''}${data.stats.membersTrend}%`, isPositive: data.stats.membersTrend >= 0, color: 'blue' },
              { label: 'New Memberships', value: data.stats.newMemberships.toString(), trend: `${data.stats.membershipsTrend > 0 ? '+' : ''}${data.stats.membershipsTrend}%`, isPositive: data.stats.membershipsTrend >= 0, color: 'emerald' },
              { label: 'Active Trainers', value: data.stats.activeTrainers.toString(), trend: `${data.stats.trainersTrend > 0 ? '+' : ''}${data.stats.trainersTrend}`, isPositive: data.stats.trainersTrend >= 0, color: 'amber' }
            ]);
          } else if (data.stats) {
            // Member stats
            this.stats.set([
              { label: 'Total Attendance', value: (data.stats.totalAttendance ?? 0).toString(), icon: 'calendar', color: 'blue' },
              { label: 'Wallet Balance', value: `${(data.stats.walletBalance ?? 0).toLocaleString()} DT`, icon: 'wallet', color: 'emerald' },
              { label: 'Active Subscriptions', value: (data.stats.activeSubscriptions ?? 0).toString(), icon: 'check-circle', color: 'indigo' },
              { label: 'Courses Enrolled', value: (data.stats.enrollments ?? 0).toString(), icon: 'book', color: 'rose' }
            ]);
          }
        },
        error: (err) => {
          console.error('Failed to load dashboard stats', err);
        }
      });
  }

  logout() {
    this.authService.logout();
  }
}
