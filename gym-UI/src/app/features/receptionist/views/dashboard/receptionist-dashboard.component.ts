import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, forkJoin } from 'rxjs';
import { GymService, GymInfo } from '../../../../core/services/gym.service';
import { ReceptionistStatsService, ReceptionistDashboardStatsDto } from './receptionist-stats.service';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receptionist-dashboard.component.html',
  styleUrl: './receptionist-dashboard.component.scss'
})
export class ReceptionistDashboardComponent {
  private gymService = inject(GymService);
  private statsService = inject(ReceptionistStatsService);

  isLoading = signal(true);
  error = signal<string | null>(null);

  gyms = signal<GymInfo[]>([]);
  stats = signal<ReceptionistDashboardStatsDto['data'] | null>(null);

  selectedGymName = computed(() => {
    const list = this.gyms();
    if (!list.length) return 'My Gyms';
    if (list.length === 1) return list[0].name;
    return 'My Gyms';
  });

  constructor() {
    this.load();
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
}

