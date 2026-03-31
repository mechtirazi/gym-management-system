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
import { UserVm } from '../../../../core/models/api.models';
import { CanDirective } from '../../../../shared/directives/can.directive';

import { OwnerDialogComponent } from '../owner-dialog/owner-dialog.component';
import { OwnerGymsListComponent } from '../owner-gyms-list/owner-gyms-list.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

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
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading = signal(false);
  ownersData = signal<UserVm[]>([]);
  searchControl = new FormControl('');
  
  searchTerm = signal('');

  expandedOwnerId = signal<string | null>(null);

  toggleRow(ownerId: string) {
    this.expandedOwnerId.set(this.expandedOwnerId() === ownerId ? null : ownerId);
  }

  filteredData = computed(() => {
     const term = this.searchTerm().toLowerCase();
     const data = this.ownersData().map(o => ({
        ...o,
        fullName: `${o.name} ${o.last_name}`,
        verificationStatus: o.email_verified_at ? 'Verified' : 'Pending',
        verified: !!o.email_verified_at,
        initials: this.getInitials(o.name, o.last_name)
     }));
     
     if (!term) return data;
     
     return data.filter(o => 
       o.fullName.toLowerCase().includes(term) || 
       o.email.toLowerCase().includes(term)
     );
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
    this.ownersService.getOwners().subscribe({
       next: (res) => {
         this.ownersData.set(res);
         this.loading.set(false);
       },
       error: () => this.loading.set(false)
    });
  }

  openDialog(user?: UserVm) {
    const dialogRef = this.dialog.open(OwnerDialogComponent, {
       width: '600px',
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
        title: 'Confirm Validation',
        message: `Are you sure you want to securely impersonate <strong>${ownerObj.fullName}</strong>?`,
        icon: 'admin_panel_settings',
        confirmText: 'Impersonate'
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
    const msg = `Are you sure you want to completely disable all gyms for <strong>${ownerObj.fullName}</strong>?<br><br>This will set ${gymCount} nodes to completely inactive status. The core identity will remain unaffected.`;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        title: 'Mass Suspension Procedure',
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
    const msg = `Are you sure you want to reactivate all operation nodes for <strong>${ownerObj.fullName}</strong>?<br><br>This will instantly set ${gymCount} gyms back to operational status.`;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        title: 'Mass Reactivation Procedure',
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
        title: 'Decoherence Confirmation',
        message: `Are you absolutely certain you want to permanently delete the identity node for <strong>${ownerObj.fullName}</strong>?<br><br>This irreversible action will destroy all associated node records.`,
        icon: 'warning',
        isDestructive: true,
        confirmText: 'Obliterate Node'
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

  trackByOwnerId = (_: number, owner: any) => owner?.id_user ?? owner?.email ?? _;

  private getInitials(first?: string | null, last?: string | null): string {
    const a = (first || '').trim().charAt(0);
    const b = (last || '').trim().charAt(0);
    const initials = `${a}${b}`.toUpperCase();
    return initials || '??';
  }
}
