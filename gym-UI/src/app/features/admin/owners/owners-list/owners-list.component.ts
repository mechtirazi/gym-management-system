import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { AdminOwnersService } from '../../../../core/services/admin-owners.service';
import { AdminGymsService } from '../../../../core/services/admin-gyms.service';
import { UserVm, GymDto } from '../../../../core/models/api.models';
import { CanDirective } from '../../../../shared/directives/can.directive';

import { OwnerDialogComponent } from '../owner-dialog/owner-dialog.component';
import { OwnerGymsListComponent } from '../owner-gyms-list/owner-gyms-list.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface OwnerRowVm {
  id_user: string;
  fullName: string;
  email: string;
  verificationStatus: string;
  verified: boolean;
  initials: string;
  isGymMode: boolean;
  created_at?: string;
  phone?: string;
  profile_picture?: string | null;

  // Fields for cross-referencing
  ownerName: string;
  ownerEmail: string;
  id_gym: string;
  adress: string;

  // Owner specific
  owned_gyms_count?: number;
  active_gyms_count?: number;
  gymNames: string;
  myGyms: GymDto[];

  // Gym specific (from GymDto)
  capacity?: number;
  id_owner?: string;
  plan?: string;
  members_count?: number;
  status?: string;
}


@Component({
  selector: 'app-owners-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule, MatDialogModule, MatSnackBarModule, MatTooltipModule, CanDirective, OwnerGymsListComponent],
  templateUrl: './owners-list.component.html',
  styleUrl: './owners-list.component.scss'
})
export class OwnersListComponent implements OnInit {
  private authService = inject(AuthService);
  private ownersService = inject(AdminOwnersService);
  private gymsService = inject(AdminGymsService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading = signal(false);
  ownersData = signal<UserVm[]>([]);
  gymsData = signal<GymDto[]>([]);
  searchControl = new FormControl('');

  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'suspended' | 'pending'>('all');

  expandedOwnerId = signal<string | null>(null);

  setFilter(status: 'all' | 'active' | 'suspended' | 'pending') {
    this.statusFilter.set(status);
  }

  toggleRow(ownerId: string) {
    this.expandedOwnerId.set(this.expandedOwnerId() === ownerId ? null : ownerId);
  }

  filteredData = computed<OwnerRowVm[]>(() => {
    const term = this.searchTerm().toLowerCase();

    const status = this.statusFilter();
    const gyms = this.gymsData();
    const owners = this.ownersData();

    // If status is suspended, we show GYMS instead of owners, but formatted for the table
    if (status === 'suspended') {
      const suspendedGyms = gyms.filter(g => g.status === 'suspended');
      
      let gymResults = suspendedGyms.map(g => {
        const owner = owners.find(o => String(o.id_user) === String(g.id_owner));
        return {
          ...g,
          id_user: g.id_gym, 
          fullName: g.name,
          email: g.adress,
          ownerName: owner ? `${owner.name} ${owner.last_name}` : 'Unknown Owner',
          ownerEmail: owner?.email || '',
          verificationStatus: 'Suspended',
          verified: false,
          initials: 'GYM',
          isGymMode: true,
          created_at: g.created_at,
          phone: g.phone || '',
          profile_picture: g.picture,
          // Add dummy fields to satisfy the union type if needed by template
          owned_gyms_count: 0,
          active_gyms_count: 0,
          gymNames: '',
          myGyms: [] as GymDto[]
        };
      }) as OwnerRowVm[];

      if (term) {
        gymResults = gymResults.filter(g => 
          g.fullName.toLowerCase().includes(term) || 
          g.ownerName.toLowerCase().includes(term) ||
          g.email.toLowerCase().includes(term)
        );
      }
      return gymResults;
    }
    
    let data = owners.map(o => {
      // Find gyms belonging to this owner for deep searching
      const myGyms = gyms.filter(g => String(g.id_owner) === String(o.id_user));
      const gymNamesStr = myGyms.map(g => g.name).join(', ');
      
      return {
        ...o,
        fullName: `${o.name} ${o.last_name}`,
        verificationStatus: o.status === 'active' ? 'Verified' : 'Pending',
        verified: o.status === 'active',
        initials: this.getInitials(o.name, o.last_name),
        gymNames: gymNamesStr,
        myGyms: myGyms,
        isGymMode: false,
        // Add dummy fields to satisfy the union type
        ownerName: '',
        ownerEmail: '',
        id_gym: '',
        adress: '',
        // Consistent fields for GymDto part
        capacity: 0,
        id_owner: '',
        plan: '',
        members_count: 0,
        status: ''
      } as OwnerRowVm;

    });

    // Apply Status Filter for Owners (Active / Pending)
    if (status !== 'all') {
      data = data.filter(o => {
        const ownedCount = +o.owned_gyms_count! || 0;
        const activeCount = +o.active_gyms_count! || 0;

        if (status === 'active') return activeCount > 0;
        if (status === 'pending') return ownedCount === 0;
        return true;
      });
    }

    // Apply Search Term
    if (term) {
      data = data.filter(o =>
        o.fullName.toLowerCase().includes(term) ||
        o.email.toLowerCase().includes(term) ||
        o.gymNames.toLowerCase().includes(term)
      );
    }

    return data;
  });

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['search']) {
        this.searchControl.setValue(params['search'], { emitEvent: false });
        this.searchTerm.set(params['search']);
      }
    });

    this.loadOwners();

    // Simple search watcher
    this.searchControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(val => {
      const searchStr = val || '';
      this.searchTerm.set(searchStr);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { search: searchStr || null },
        queryParamsHandling: 'merge'
      });
    });
  }

  loadOwners() {
    this.loading.set(true);
    
    // Fetch both owners and gyms in parallel to enable client-side deep searching
    forkJoin({
      owners: this.ownersService.getOwners(),
      gyms: this.gymsService.getGyms()
    }).subscribe({
      next: (res) => {
        this.ownersData.set(res.owners);
        this.gymsData.set(res.gyms);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDialog(user?: UserVm) {
    const dialogRef = this.dialog.open(OwnerDialogComponent, {
      width: '450px',
      disableClose: true,
      data: { user }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.snackBar.open(user ? 'Owner updated.' : 'Owner created successfully.', 'Dismiss', { duration: 3000 });
        this.loadOwners(); // Re-fetch list
      }
    });
  }

  editOwner(ownerObj: any) {
    // We map back to the real object
    const realOwner = this.ownersData().find(o => o.id_user === ownerObj.id_user);
    if (realOwner) this.openDialog(realOwner);
  }

  impersonateOwner(ownerObj: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        title: 'Confirm Access',
        message: `Are you sure you want to securely access the account for <strong>${ownerObj.fullName}</strong>?`,
        icon: 'admin_panel_settings',
        confirmText: 'Access Account'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loading.set(true);
        this.authService.impersonate(ownerObj.id_user, ownerObj.fullName).subscribe({
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to impersonate owner.', 'Dismiss', { duration: 4000 });
            this.loading.set(false);
          }
        });
      }
    });
  }

  disableAllGyms(ownerObj: any) {
    const gymCount = ownerObj.owned_gyms_count || 0;
    const msg = `Are you sure you want to disable all gyms for <strong>${ownerObj.fullName}</strong>?<br><br>This will set ${gymCount} gyms to inactive. The owner's account will remain unaffected.`;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        title: 'Bulk Suspension',
        message: msg,
        icon: 'gpp_bad',
        isDestructive: true,
        confirmText: 'Suspend All'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loading.set(true);
        this.ownersService.disableAllGyms(ownerObj.id_user).subscribe({
          next: () => {
            this.snackBar.open(`All ${gymCount} gyms have been disabled.`, 'Dismiss', { duration: 3000 });
            this.loadOwners();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to disable gyms.', 'Dismiss', { duration: 4000 });
            this.loading.set(false);
          }
        });
      }
    });
  }

  activateAllGyms(ownerObj: any) {
    const gymCount = ownerObj.owned_gyms_count || 0;
    const msg = `Are you sure you want to reactivate all gyms for <strong>${ownerObj.fullName}</strong>?<br><br>This will instantly set ${gymCount} gyms back to active status.`;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        title: 'Bulk Reactivation',
        message: msg,
        icon: 'published_with_changes',
        confirmText: 'Activate All'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loading.set(true);
        this.ownersService.activateAllGyms(ownerObj.id_user).subscribe({
          next: () => {
            this.snackBar.open(`All ${gymCount} gyms have been activated.`, 'Dismiss', { duration: 3000 });
            this.loadOwners();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to activate gyms.', 'Dismiss', { duration: 4000 });
            this.loading.set(false);
          }
        });
      }
    });
  }

  deleteOwner(ownerObj: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        title: 'Delete Confirmation',
        message: `Are you absolutely certain you want to permanently delete the account for <strong>${ownerObj.fullName}</strong>?<br><br>This action is irreversible and will delete all associated records.`,
        icon: 'warning',
        isDestructive: true,
        confirmText: 'Delete Owner'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loading.set(true);
        this.ownersService.deleteOwner(ownerObj.id_user).subscribe({
          next: () => {
            this.snackBar.open('Node completely eliminated.', 'Dismiss', { duration: 3000 });
            this.loadOwners();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to delete owner node.', 'Dismiss', { duration: 4000 });
            this.loading.set(false);
          }
        });
      }
    });
  }

  activateGymFromResult(gymRow: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        title: 'Instant Reactivation',
        message: `Are you sure you want to reactivate the facility <strong>${gymRow.fullName}</strong> for provider <strong>${gymRow.ownerName}</strong>?`,
        icon: 'play_circle',
        confirmText: 'Activate Facility'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loading.set(true);
        this.gymsService.activateGym(gymRow.id_gym).subscribe({
          next: () => {
             this.snackBar.open(`Facility ${gymRow.fullName} is now operational.`, 'Dismiss', { duration: 3000 });
             this.loadOwners();
          },
          error: (err) => {
             this.snackBar.open(err.error?.message || 'Failed to activate gym.', 'Dismiss', { duration: 4000 });
             this.loading.set(false);
          }
        });
      }
    });
  }

  trackByOwnerId = (_: number, owner: any) => owner?.id_user ?? owner?.id_gym ?? owner?.email ?? _;

  private getInitials(first?: string | null, last?: string | null): string {
    const a = (first || '').trim().charAt(0);
    const b = (last || '').trim().charAt(0);
    const initials = `${a}${b}`.toUpperCase();
    return initials || '??';
  }

  getProfileImageUrl(path: string | null | undefined): string | null {
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
