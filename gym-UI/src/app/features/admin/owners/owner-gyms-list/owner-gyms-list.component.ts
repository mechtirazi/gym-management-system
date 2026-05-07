import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GymDto } from '../../../../core/models/api.models';
import { AdminOwnersService } from '../../../../core/services/admin-owners.service';
import { AdminGymsService } from '../../../../core/services/admin-gyms.service';
import { GymDialogComponent } from '../gym-dialog/gym-dialog.component';
import { SuspendDialogComponent } from '../../gyms/suspend-dialog.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-owner-gyms-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './owner-gyms-list.component.html',
  styleUrl: './owner-gyms-list.component.scss'
})
export class OwnerGymsListComponent implements OnInit {
  private _ownerId!: number | string;
  @Input({ required: true }) set ownerId(val: number | string) {
    this._ownerId = val;
    if (this._ownerId) this.fetchGyms();
  }
  get ownerId(): number | string { return this._ownerId; }

  @Input() ownerName!: string;

  private ownersService = inject(AdminOwnersService);
  private adminGymsService = inject(AdminGymsService);
  private dialog = inject(MatDialog);

  gyms = signal<GymDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
  }

  fetchGyms() {
    this.loading.set(true);
    this.ownersService.getGymsByOwner(this.ownerId).subscribe({
      next: (data) => {
        this.gyms.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load gyms.');
        this.loading.set(false);
      }
    });
  }

  openAddGymDialog() {
    const dialogRef = this.dialog.open(GymDialogComponent, {
      width: '850px',
      maxWidth: '95vw',
      data: { ownerId: this.ownerId, ownerName: this.ownerName }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the local array / observable automatically without full page reload
        this.fetchGyms();
      }
    });
  }

  openSuspendDialog(gym: GymDto) {
    const dialogRef = this.dialog.open(SuspendDialogComponent, {
      width: '480px',
      data: { gymName: gym.name }
    });

    dialogRef.afterClosed().subscribe((reason: string) => {
      if (reason) {
        this.loading.set(true);
        this.adminGymsService.suspendGym(gym.id_gym, reason).subscribe({
          next: () => {
            this.fetchGyms();
          },
          error: () => this.loading.set(false)
        });
      }
    });
  }

  activateGym(gym: GymDto) {
    this.loading.set(true);
    this.adminGymsService.activateGym(gym.id_gym).subscribe({
      next: () => {
        this.fetchGyms();
      },
      error: () => this.loading.set(false)
    });
  }

  deleteGym(gym: GymDto) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Delete Gym Permanently',
        message: `Are you sure you want to delete <strong>${gym.name}</strong>?<br><br>This action is <strong>irreversible</strong> and will delete all associated members, courses, and financial records.`,
        confirmText: 'Delete Permanently',
        cancelText: 'Keep Gym',
        isDestructive: true,
        icon: 'delete_forever'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading.set(true);
        this.adminGymsService.deleteGym(gym.id_gym).subscribe({
          next: () => {
            this.fetchGyms();
          },
          error: (err) => {
            console.error('Delete error:', err);
            this.error.set(err.error?.message || 'Failed to delete gym.');
            this.loading.set(false);
          }
        });
      }
    });
  }

  trackByGymId = (_: number, gym: GymDto) => gym.id_gym;

  public getGymImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    
    if (cleanPath.startsWith('storage/')) {
        return `${baseUrl}/${cleanPath}`;
    }
    return `${baseUrl}/storage/${cleanPath}`;
  }
}
