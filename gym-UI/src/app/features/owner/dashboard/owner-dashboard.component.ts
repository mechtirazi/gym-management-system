import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OwnerDashboardService } from '../services/owner-dashboard.service';
import { DashboardStatsComponent } from './components/dashboard-stats/dashboard-stats';
import { RevenueChartComponent } from './components/revenue-chart/revenue-chart';
import { RecentCheckinsComponent } from './components/recent-checkins/recent-checkins';
import { AddMemberModalComponent } from './components/add-member-modal/add-member-modal';
import { NutritionMessagesComponent } from '../../nutritionist/utils/nutrition-messages.component';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { DashboardData, UpcomingSession, InventoryAlert, ExpiringMembership, Checkin, StaffSnapshotMember, TopProduct, TopCourse, TopMembershipPlan } from '../../../shared/models/dashboard.model';

type DashboardTopProduct = TopProduct & {
  imageUrl: string;
  fallbackImage: string;
};

type DashboardTopCourse = TopCourse & {
  imageUrl: string;
  fallbackImage: string;
};

type DashboardTopMembershipPlan = TopMembershipPlan & {
  typeLabel: string;
};

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DashboardStatsComponent,
    RevenueChartComponent,
    RecentCheckinsComponent,
    AddMemberModalComponent,
    NutritionMessagesComponent
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.scss'
})
export class OwnerDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(OwnerDashboardService);
  private readonly mediaBaseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
  private readonly planColorPalette = ['#10b981', '#0ea5e9', '#f59e0b', '#a855f7', '#f43f5e'];

  ownerName = (this.authService.currentUser() as any)?.name || 'Owner';
  currentDate = new Date();
  showMemberModal = signal<boolean>(false);

  isLoading = signal<boolean>(true);
  stats = signal<any>(null);
  recentCheckins = signal<Checkin[]>([]);

  upcomingSessions = signal<UpcomingSession[]>([]);
  inventoryAlerts = signal<InventoryAlert[]>([]);
  expiringMemberships = signal<ExpiringMembership[]>([]);

  staffSnapshot = signal<StaffSnapshotMember[]>([]);
  topProducts = signal<DashboardTopProduct[]>([]);
  topCourses = signal<DashboardTopCourse[]>([]);
  topMembershipPlans = signal<DashboardTopMembershipPlan[]>([]);
  selectedStaffForChat = signal<StaffSnapshotMember | null>(null);
  membershipPlanSoldTotal = computed(() =>
    this.topMembershipPlans().reduce((sum, plan) => sum + this.toSafeNumber(plan.total_sold), 0)
  );

  openStaffChat(staff: StaffSnapshotMember) {
    this.selectedStaffForChat.set(staff);
  }

  closeStaffChat() {
    this.selectedStaffForChat.set(null);
  }

  onCardImageError(event: Event, fallbackUrl: string) {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== fallbackUrl) {
      target.src = fallbackUrl;
    }
  }


  ngOnInit() {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.isLoading.set(true);

    // Fetch Main Stats payload
    this.dashboardService.getDashboardData()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data: DashboardData) => {
          this.stats.set(data.stats);
          this.upcomingSessions.set(data.upcomingSessions || []);
          this.inventoryAlerts.set(data.inventoryAlerts || []);
          this.expiringMemberships.set(data.expiringMemberships || []);

          this.staffSnapshot.set(data.staffSnapshot || []);
          this.topProducts.set((data.topProducts || []).map((item) => this.normalizeTopProduct(item)));
          this.topCourses.set((data.topCourses || []).map((course) => this.normalizeTopCourse(course)));
          this.topMembershipPlans.set((data.topMembershipPlans || []).map((plan) => this.normalizeTopMembershipPlan(plan)));

        }
      });

    // Fetch Checkins payload
    this.dashboardService.getRecentCheckins().subscribe({
      next: (data) => this.recentCheckins.set(data || [])
    });
  }

  private normalizeTopProduct(item: Partial<TopProduct>): DashboardTopProduct {
    const name = (item.name || 'Product').trim() || 'Product';
    const fallbackImage = this.buildImageFallback(name, '0f766e');

    return {
      id_product: item.id_product,
      name,
      total_sold: Math.max(0, Math.round(this.toSafeNumber(item.total_sold))),
      revenue: this.toSafeNumber(item.revenue),
      image: item.image ?? null,
      imageUrl: this.resolveMediaUrl(item.image, fallbackImage),
      fallbackImage
    };
  }

  private normalizeTopCourse(course: Partial<TopCourse>): DashboardTopCourse {
    const name = (course.name || 'Course').trim() || 'Course';
    const fallbackImage = this.buildImageFallback(name, '0369a1');
    const enrolled = Math.max(0, Math.round(this.toSafeNumber(course.enrolled)));
    const capacity = Math.max(0, Math.round(this.toSafeNumber(course.capacity)));
    const occupancyFromTotals = capacity > 0 ? (enrolled / capacity) * 100 : this.toSafeNumber(course.occupancy);

    return {
      id_course: course.id_course,
      name,
      enrolled,
      capacity,
      occupancy: this.clamp(occupancyFromTotals, 0, 100),
      image: course.image ?? null,
      imageUrl: this.resolveMediaUrl(course.image, fallbackImage),
      fallbackImage
    };
  }

  private normalizeTopMembershipPlan(plan: Partial<TopMembershipPlan>): DashboardTopMembershipPlan {
    const type = (plan.type || 'standard').trim().toLowerCase();

    return {
      id: plan.id,
      name: (plan.name || 'Membership Plan').trim() || 'Membership Plan',
      type,
      typeLabel: type.charAt(0).toUpperCase() + type.slice(1),
      price: this.toSafeNumber(plan.price),
      total_sold: Math.max(0, Math.round(this.toSafeNumber(plan.total_sold))),
      active_members: Math.max(0, Math.round(this.toSafeNumber(plan.active_members))),
      estimated_revenue: this.toSafeNumber(plan.estimated_revenue)
    };
  }

  membershipPlanColor(plan: DashboardTopMembershipPlan, index: number): string {
    const typeColorMap: Record<string, string> = {
      standard: '#10b981',
      premium: '#0ea5e9',
      trial: '#f59e0b'
    };

    return typeColorMap[plan.type] || this.planColorPalette[index % this.planColorPalette.length];
  }

  membershipPlanShare(plan: DashboardTopMembershipPlan): number {
    const total = this.membershipPlanSoldTotal();
    if (total <= 0) {
      return 0;
    }
    return (this.toSafeNumber(plan.total_sold) / total) * 100;
  }

  membershipPieGradient(): string {
    const plans = this.topMembershipPlans();
    const total = this.membershipPlanSoldTotal();

    if (plans.length === 0 || total <= 0) {
      return 'conic-gradient(#e2e8f0 0% 100%)';
    }

    let start = 0;
    const segments: string[] = plans.map((plan, index) => {
      const share = (this.toSafeNumber(plan.total_sold) / total) * 100;
      const end = start + share;
      const color = this.membershipPlanColor(plan, index);
      const segment = `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      start = end;
      return segment;
    });

    if (start < 100) {
      segments.push(`#e2e8f0 ${start.toFixed(2)}% 100%`);
    }

    return `conic-gradient(${segments.join(', ')})`;
  }

  private resolveMediaUrl(path: string | null | undefined, fallbackUrl: string): string {
    if (!path) {
      return fallbackUrl;
    }

    if (path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }

    const cleanPath = path.replace(/^\//, '');
    if (!cleanPath) {
      return fallbackUrl;
    }

    if (cleanPath.startsWith('storage/')) {
      return `${this.mediaBaseUrl}/${cleanPath}`;
    }

    return `${this.mediaBaseUrl}/storage/${cleanPath}`;
  }

  private buildImageFallback(name: string, background: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=fff&bold=true`;
  }

  private toSafeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}

