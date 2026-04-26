import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { AdminGymsService, GymDto } from '../../../core/services/admin-gyms.service';
import { SuspendDialogComponent } from './suspend-dialog.component';
import { computed } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gyms-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSortModule,
    FormsModule
  ],
  template: `
    <div class="admin-page-container">
      <div class="gyms-list-header">
        <header class="admin-header">
          <div class="admin-badge-mini">
            <mat-icon style="font-size: 14px; width: 14px; height: 14px;">storefront</mat-icon>
            Macro Governance
          </div>
          <h1>System Facilities</h1>
          <p>Global oversight of gym access and operational status</p>
        </header>

        <button (click)="loadGyms()" class="admin-btn" [disabled]="loading()">
          <mat-icon [class.is-spinning]="loading()">refresh</mat-icon>
          <span>Refresh List</span>
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="admin-search-bar" role="search">
        <div class="search-input-wrap">
          <mat-icon>search</mat-icon>
          <input type="text"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
            placeholder="Search by facility or provider node..."
            autocomplete="off"
          >
        </div>

        <div class="admin-form-group" style="flex-direction: row; gap: 0; min-width: 200px;">
           <div class="form-field" style="width: 100%; gap: 0;">
              <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" 
                      style="border-radius: 1rem; padding: 0.75rem 1rem 0.75rem 0.75rem;">
                <option value="all">All Ecosystem States</option>
                <option value="active">Operational Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
           </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="relative min-h-[400px]">
        <!-- Skeleton -->
        <div *ngIf="loading()" class="gym-skeletons animate-in zoom-in-95 duration-500">
          <div class="skeleton-card" *ngFor="let _ of [1,2,3]"></div>
        </div>

        <!-- Table View -->
        <div *ngIf="!loading() && filteredGyms().length > 0" class="admin-table-container">
          <table>
            <thead>
              <tr>
                <th>Facility Node</th>
                <th>Platform Provider</th>
                <th>Community Size</th>
                <th>System Status</th>
                <th style="text-align: right;">Operations</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let gym of filteredGyms()" class="group">
                <td>
                  <div class="flex items-center gap-4">
                    <div class="gym-icon-box shadow-lg" [class.no-image]="!gym.picture">
                      <mat-icon *ngIf="!gym.picture">fitness_center</mat-icon>
                      <img *ngIf="gym.picture" [src]="getGymImageUrl(gym.picture)" [alt]="gym.name" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />
                    </div>
                    <span class="main-text">{{ gym.name }}</span>
                  </div>
                </td>
                <td>
                  <span class="main-text">{{ gym.owner?.name }}</span>
                  <span class="sub-text">Verified Provider</span>
                </td>
                <td>
                  <div class="community-tag">
                    <mat-icon>groups</mat-icon>
                    <span>{{ gym.members_count || 0 }}</span>
                  </div>
                </td>
                <td>
                  <div class="status-indicator" [ngClass]="gym.status === 'active' ? 'active' : 'suspended'">
                    <div class="dot"></div>
                    {{ gym.status }}
                  </div>
                </td>
                <td style="text-align: right;">
                  <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button *ngIf="gym.status === 'active'" (click)="openSuspendDialog(gym.id_gym)" [disabled]="actionInProgress()"
                      class="admin-btn" style="padding: 0.5rem 1rem; font-size: 0.625rem; background: rgba(244, 63, 94, 0.1); color: var(--admin-accent-rose); border-color: rgba(244, 63, 94, 0.2);">
                      <mat-icon style="font-size: 14px; width: 14px; height: 14px;">block</mat-icon>
                      Suspend
                    </button>
                    <button *ngIf="gym.status === 'suspended'" (click)="activateGym(gym)" [disabled]="actionInProgress()"
                      class="admin-btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.625rem;">
                      <mat-icon style="font-size: 14px; width: 14px; height: 14px;">check_circle</mat-icon>
                      Reactivate
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading() && filteredGyms().length === 0" class="empty-gyms">
          <div class="icon-circle shadow-lg">
            <mat-icon style="font-size: 32px; width: 32px; height: 32px;">storefront</mat-icon>
          </div>
          <h2>No facilities found</h2>
          <p>Adjust your search parameters or filters</p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './gyms-list.component.scss'
})
export class GymsListComponent implements OnInit {
  private gymsService = inject(AdminGymsService);
  private dialog = inject(MatDialog);

  gyms = signal<GymDto[]>([]);
  loading = signal(true);
  actionInProgress = signal(false);

  // Search & Filter state
  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'suspended'>('all');
  activeSort = signal<Sort>({ active: '', direction: '' });

  // Computed derived list
  filteredGyms = computed<GymDto[]>(() => {
    const list = this.gyms();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const sort = this.activeSort();

    let result = list.filter(gym => {
      const gName = gym.name.toLowerCase();
      const oName = gym.owner?.name?.toLowerCase() || '';

      const matchesSearch = !search || gName.includes(search) || oName.includes(search);
      const matchesStatus = status === 'all' || gym.status === status;
      return matchesSearch && matchesStatus;
    });

    if (sort.active && sort.direction) {
      result = [...result].sort((a, b) => {
        const isAsc = sort.direction === 'asc';
        switch (sort.active) {
          case 'name': return this.compare(a.name, b.name, isAsc);
          case 'members_count': return this.compare(a.members_count || 0, b.members_count || 0, isAsc);
          case 'status': return this.compare(a.status, b.status, isAsc);
          default: return 0;
        }
      });
    }

    return result;
  });

  private compare(a: string | number, b: string | number, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  ngOnInit() {
    this.loadGyms();
  }

  loadGyms() {
    this.loading.set(true);
    this.gymsService.getGyms().subscribe({
      next: (data) => {
        this.gyms.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openSuspendDialog(id_gym: GymDto['id_gym']) {
    const gym = this.gyms().find(g => g.id_gym === id_gym);
    if (!gym) return;
    const dialogRef = this.dialog.open(SuspendDialogComponent, {
      width: '480px',
      data: { gymName: gym.name }
    });

    dialogRef.afterClosed().subscribe((reason: string) => {
      if (reason) {
        this.actionInProgress.set(true);
        this.gymsService.suspendGym(id_gym, reason).subscribe({
          next: () => {
            this.actionInProgress.set(false);
            this.loadGyms();
          },
          error: () => this.actionInProgress.set(false)
        });
      }
    });
  }

  activateGym(gym: GymDto) {
    this.actionInProgress.set(true);
    this.gymsService.activateGym(gym.id_gym).subscribe({
      next: () => {
        this.actionInProgress.set(false);
        this.loadGyms();
      },
      error: () => this.actionInProgress.set(false)
    });
  }

  getGymImageUrl(path: string | null | undefined): string | null {
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
