import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OwnerDashboardService } from '../../../services/owner-dashboard.service';
import { Checkin } from '../../../../../shared/models/dashboard.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-recent-checkins',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-checkins.html',
  styleUrl: './recent-checkins.scss'
})
export class RecentCheckinsComponent implements OnInit {
  private dashboardService = inject(OwnerDashboardService);

  isLoadingCheckins = signal<boolean>(true);
  checkinsError = signal<string | null>(null);
  recentCheckins = signal<Checkin[]>([]);

  ngOnInit() {
    this.fetchRecentCheckins();
  }

  fetchRecentCheckins() {
    this.isLoadingCheckins.set(true);
    this.checkinsError.set(null);
    this.dashboardService.getRecentCheckins()
      .pipe(finalize(() => this.isLoadingCheckins.set(false)))
      .subscribe({
        next: (data) => this.recentCheckins.set(data),
        error: (err) => {
          console.error('Checkins error:', err);
          this.checkinsError.set('Unable to load check-ins.');
        }
      });
  }
}
