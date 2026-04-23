import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NutritionistNutritionService } from '../services/nutritionist-nutrition.service';
import { NotificationService } from '../../../core/services/notification.service';
import { finalize } from 'rxjs/operators';
import { extractApiList, isMemberUser, isOwnedByNutritionist } from '../utils/nutritionist-dashboard.utils';

@Component({
  selector: 'app-nutritionist-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nutritionist-dashboard.component.html',
  styleUrl: './nutritionist-dashboard.component.scss'
})
export class NutritionistDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private api = inject(NutritionistNutritionService);
  private notifications = inject(NotificationService);

  nutritionistName = computed(() => {
    const u = this.authService.currentUser();
    if (!u) return 'Nutritionist';
    return `${u.name ?? ''} ${u.last_name ?? ''}`.trim() || 'Nutritionist';
  });

  isLoading = signal(true);
  error = signal<string | null>(null);

  clientsCount = signal(0);
  plansCount = signal(0);
  activePlansCount = signal(0);
  expiringSoonCount = signal(0);

  currentTime = signal(new Date());

  unreadNotifications = this.notifications.unreadCount;
  latestNotifications = computed(() => this.notifications.notifications().slice(0, 5));

  ngOnInit(): void {
    this.load();
    this.startClock();
  }

  private startClock(): void {
    setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000 * 60);
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const me = this.authService.currentUser()?.id_user;
    const today = new Date().toISOString().split('T')[0];

    // Clients
    this.api.getClients().subscribe({
      next: res => {
        const users = extractApiList<any>(res).filter(isMemberUser);
        this.clientsCount.set(users.length);
      },
      error: () => this.clientsCount.set(0)
    });

    // Plans
    this.api
      .getNutritionPlans(1, 200)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: res => {
          const plans = extractApiList<any>(res);
          const myPlans = me ? plans.filter((p: any) => isOwnedByNutritionist(p, me)) : [];

          this.plansCount.set(myPlans.length);
          this.activePlansCount.set(myPlans.filter((p: any) => p.start_date <= today && p.end_date >= today).length);

          const in7days = new Date();
          in7days.setDate(in7days.getDate() + 7);
          const in7 = in7days.toISOString().split('T')[0];
          this.expiringSoonCount.set(myPlans.filter((p: any) => p.end_date >= today && p.end_date <= in7).length);
        },
        error: () => {
          this.error.set('Could not load dashboard metrics.');
          this.plansCount.set(0);
          this.activePlansCount.set(0);
          this.expiringSoonCount.set(0);
        }
      });

    this.notifications.fetchNotifications().subscribe();
  }

  markNotificationRead(id: string): void {
    this.notifications.markAsRead(id);
  }

  markAllNotificationsRead(): void {
    this.notifications.markAllAsRead();
  }
}

