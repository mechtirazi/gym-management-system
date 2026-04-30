import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GymService, GymInfo } from '../../../core/services/gym.service';
import { AuthService } from '../../../core/services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-my-gyms',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  ngOnInit(): void {
    this.loadGyms();
  }

  loadGyms(): void {
    this.isLoading.set(true);
    this.gymService.getMyGyms().subscribe({
      next: (gyms) => {
        this.gyms.set(gyms);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load gyms.');
        this.isLoading.set(false);
      }
    });
  }

  reactivateGym(gym: GymInfo): void {
    if (confirm(`Are you sure you want to reactivate ${gym.name}?`)) {
      this.isLoading.set(true);
      this.gymService.reactivateGym(gym.id_gym).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.successMessage.set(`${gym.name} has been reactivated successfully!`);
            this.loadGyms(); // Refresh the list
          } else {
            this.errorMessage.set(response.message || 'Failed to reactivate gym.');
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'An error occurred during reactivation.');
          this.isLoading.set(false);
        }
      });
    }
  }

  getAvatarUrl(path?: string): string {
    return this.authService.getAvatarUrl(path);
  }
}
