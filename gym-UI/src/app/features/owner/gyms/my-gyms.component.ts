import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GymService } from '../../../core/services/gym.service';
import { GymInfo } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-my-gyms',
  standalone: true,
  imports: [CommonModule, RouterModule, PaymentModalComponent, MatIconModule, MatButtonModule],
  templateUrl: './my-gyms.component.html',
  styleUrl: './my-gyms.component.scss'
})
export class MyGymsComponent implements OnInit {
  private gymService = inject(GymService);
  private authService = inject(AuthService);

  gyms = signal<GymInfo[]>([]);
  isLoading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Platform Renewal State
  showRenewalModal = signal(false);
  selectedGymForRenewal = signal<GymInfo | null>(null);
  processingRenewal = signal(false);
  platformPlans = [
    { id: 'monthly', name: 'Monthly Protocol', price: 49.99, type: 'monthly', duration_days: 30 },
    { id: 'semester', name: 'Semestrial Protocol', price: 239.94, type: 'semester', duration_days: 180 },
    { id: 'yearly', name: 'Annual Protocol', price: 359.88, type: 'yearly', duration_days: 365 }
  ];

  ngOnInit(): void {
    this.loadGyms();
  }

  loadGyms(): void {
    this.isLoading.set(true);
    this.gymService.getMyGyms().subscribe({
      next: (gyms) => {
        const processedGyms = gyms.map(gym => {
          const expiryDate = gym.subscription_expires_at;
          const days = this.calculateDaysRemaining(expiryDate);
          return {
            ...gym,
            days_remaining: days
          };
        });
        this.gyms.set(processedGyms);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to refresh your gym list.');
        this.isLoading.set(false);
      }
    });
  }

  calculateDaysRemaining(expiryDate?: string): number {
    if (!expiryDate) return -1;
    const now = new Date();
    const expiry = new Date(expiryDate);
    
    // Check if valid date
    if (isNaN(expiry.getTime())) return -1;

    // Reset hours to compare only dates
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  openRenewal(gym: GymInfo): void {
    if ((gym.days_remaining || 0) > 1) {
      this.errorMessage.set(`You cannot renew ${gym.name} yet. You still have ${gym.days_remaining} days left on your current plan.`);
      return;
    }
    this.selectedGymForRenewal.set(gym);
    this.showRenewalModal.set(true);
  }

  closeRenewal(): void {
    this.showRenewalModal.set(false);
    this.selectedGymForRenewal.set(null);
  }

  completeRenewal(event: any): void {
    const gym = this.selectedGymForRenewal();
    if (!gym) return;

    this.processingRenewal.set(true);
    this.gymService.renewPlatformSubscription(gym.id_gym, event.plan.id, event.method).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage.set(`Protocol for ${gym.name} renewed successfully.`);
          this.loadGyms();
          this.closeRenewal();
        }
        this.processingRenewal.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Renewal failed. Please try again.');
        this.processingRenewal.set(false);
      }
    });
  }

  getAvatarUrl(path?: string): string {
    return this.authService.getAvatarUrl(path);
  }
}
