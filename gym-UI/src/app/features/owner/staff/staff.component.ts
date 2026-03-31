import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StaffService } from './services/staff.service';
import { StaffMember } from '../../../shared/models/staff-member.model';
import { finalize } from 'rxjs';

import { StaffCardComponent } from './components/staff-card/staff-card.component';
import { HireStaffModalComponent } from './components/hire-staff-modal/hire-staff-modal.component';
import { StaffProfileModalComponent } from './components/staff-profile-modal/staff-profile-modal.component';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StaffCardComponent,
    HireStaffModalComponent,
    StaffProfileModalComponent
  ],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss'
})
export class StaffManagementComponent implements OnInit {
  private staffService = inject(StaffService);
  private confirmService = inject(ConfirmDialogService);

  private allStaff = signal<StaffMember[]>([]);

  searchQuery = signal<string>('');
  selectedRole = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Pagination states
  currentPage = signal<number>(1);
  pageSize = signal<number>(9);
  totalItems = signal<number>(0);
  lastPage = signal<number>(1);

  // Modal states
  showAddForm = signal<boolean>(false);
  showProfileModal = signal<boolean>(false);
  selectedProfile = signal<StaffMember | null>(null);
  isEditMode = signal<boolean>(false);

  // ─── Computed filtered list ───────────────────────────────────────────────
  staffMembers = computed(() => {
    const role = this.selectedRole();
    const query = this.searchQuery().toLowerCase();

    return this.allStaff().filter((member) => {
      let matchesRole = true;
      if (role !== 'All') {
        const memberRole = (member.role || '').toLowerCase();
        if (role === 'Trainer') matchesRole = memberRole.includes('trainer');
        else if (role === 'Reception') matchesRole = memberRole.includes('reception');
        else if (role === 'Nutritionist') matchesRole = memberRole.includes('nutritionist');
        else matchesRole = memberRole === role.toLowerCase();
      }

      let matchesQuery = true;
      if (query) {
        matchesQuery =
          (member.name || '').toLowerCase().includes(query) ||
          (member.email || '').toLowerCase().includes(query) ||
          (member.phone || '').toLowerCase().includes(query) ||
          (member.role || '').toLowerCase().includes(query);
      }

      return matchesRole && matchesQuery;
    });
  });

  ngOnInit() {
    this.refreshStaff();
  }

  // ─── Load / refresh ───────────────────────────────────────────────────────
  refreshStaff() {
    this.isLoading.set(true);
    this.error.set(null);

    this.staffService.getStaff(this.currentPage(), this.pageSize())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          let staffItems: any[] = [];
          if (response?.data) {
            if (Array.isArray(response.data)) {
              staffItems = response.data;
            } else if (Array.isArray(response.data.user)) {
               staffItems = response.data.user;
            }
          } else if (Array.isArray(response)) {
            staffItems = response;
          }

          // Handle Pagination Meta mapping
          if (response?.current_page !== undefined) {
             this.currentPage.set(response.current_page);
             this.totalItems.set(response.total || staffItems.length);
             this.lastPage.set(response.last_page || 1);
          } else {
             this.totalItems.set(staffItems.length);
             this.lastPage.set(1);
          }

          this.allStaff.set(staffItems.map((item: any) => {
            const u = item.user || item;
            return {
              id: item.id_gym_staff ?? u.id_user ?? item.id,
              userId: u.id_user ?? u.id ?? item.id_user,
              name: u.name && u.last_name ? `${u.name} ${u.last_name}` : (u.name || 'Personnel'),
              role: u.role || 'Staff',
              email: u.email || 'N/A',
              phone: u.phone || '—',
              status: item.status || u.status || 'Active',
              joinedAt: item.created_at || u.created_at || new Date().toISOString()
            };
          }));
        },
        error: (err) => {
          console.error('Staff load error:', err);
          this.error.set(
            err.status === 401
              ? 'Unauthorized. Please re-login.'
              : 'Could not fetch staff list. Check your connection.'
          );
        }
      });
  }

  // ─── Filters ──────────────────────────────────────────────────────────────
  onRoleChange(role: string) { 
    this.selectedRole.set(role); 
  }

  // ─── Pagination Controls ──────────────────────────────────────────────────
  nextPage() {
    if (this.currentPage() < this.lastPage()) {
      this.currentPage.update(p => p + 1);
      this.refreshStaff();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.refreshStaff();
    }
  }

  // ─── Modal Controls ───────────────────────────────────────────────────────
  openProfile(member: StaffMember) {
    this.selectedProfile.set(member);
    this.isEditMode.set(false);
    this.showProfileModal.set(true);
  }

  openEdit(member: StaffMember) {
    this.selectedProfile.set(member);
    this.isEditMode.set(true);
    this.showProfileModal.set(true);
  }

  closeProfile() {
    this.showProfileModal.set(false);
    this.selectedProfile.set(null);
    this.isEditMode.set(false);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  deleteStaffMember(id: string) {
    if (!id) return;
    
    this.confirmService.open({
      title: 'Remove Staff Personnel',
      message: 'Are you absolutely sure you want to permanently remove this staff member?',
      confirmText: 'Remove Personnel',
      icon: 'person_remove',
      isDestructive: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.staffService.deleteStaff(id).subscribe({
          next: () => this.refreshStaff(),
          error: () => this.error.set('Could not remove staff member. Check your permissions.')
        });
      }
    });
  }
}
