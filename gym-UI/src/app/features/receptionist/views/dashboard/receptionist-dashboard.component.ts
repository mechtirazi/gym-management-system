import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { GymService, GymInfo } from '../../../../core/services/gym.service';
import { ReceptionistStatsService, ReceptionistDashboardStatsDto } from './receptionist-stats.service';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './receptionist-dashboard.component.html',
  styleUrl: './receptionist-dashboard.component.scss'
})
export class ReceptionistDashboardComponent implements OnInit, OnDestroy {
  private gymService = inject(GymService);
  private statsService = inject(ReceptionistStatsService);
  private router = inject(Router);

  isLoading = signal(true);
  error = signal<string | null>(null);

  gyms = signal<GymInfo[]>([]);
  stats = signal<ReceptionistDashboardStatsDto['data'] | null>(null);
  
  today = signal(new Date());
  private timer: any;

  selectedGymName = computed(() => {
    const list = this.gyms();
    if (!list.length) return 'My Gyms';
    return list[0].name;
  });

  membershipHealth = computed(() => {
    const s = this.stats();
    if (!s || !s.kpis.membersTotal) return 0;
    return Math.min(100, (s.kpis.activeEnrollments / s.kpis.membersTotal) * 100);
  });

  revenueProgress = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    // Assume a monthly target of 10,000 for visual progress, or just use month/yearRatio
    return Math.min(100, (s.kpis.revenueThisMonth / 10000) * 100);
  });

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.today.set(new Date()), 60000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  load() {
    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      gyms: this.gymService.getMyGyms(),
      stats: this.statsService.getDashboardStats().pipe(finalize(() => this.isLoading.set(false)))
    }).subscribe({
      next: ({ gyms, stats }) => {
        this.gyms.set(gyms);
        this.stats.set(stats);
      },
      error: () => {
        this.error.set('Could not load dashboard data. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}

