import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberService } from './services/member.service';
import { GymMember } from '../../../shared/models/gym-member.model';
import { finalize } from 'rxjs';
import { AddMemberModalComponent } from '../dashboard/components/add-member-modal/add-member-modal';
import { MemberHeaderComponent } from './components/member-header/member-header.component';
import { MemberControlsComponent } from './components/member-controls/member-controls.component';
import { MemberCardComponent } from './components/member-card/member-card.component';
import { MemberProfileModalComponent } from './components/member-profile-modal/member-profile-modal.component';
import { MemberStatsComponent } from './components/member-stats/member-stats.component';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
  selector: 'app-member-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddMemberModalComponent,
    MemberHeaderComponent,
    MemberControlsComponent,
    MemberCardComponent,
    MemberProfileModalComponent,
    MemberStatsComponent
  ],
  templateUrl: './member.component.html',
  styleUrl: './member.component.scss'
})
export class MemberManagementComponent implements OnInit {
  private memberService = inject(MemberService);
  private confirmService = inject(ConfirmDialogService);

  private allMembers = signal<GymMember[]>([]);

  searchQuery = signal<string>('');
  selectedStatus = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Modal signals
  isAddModalOpen = signal<boolean>(false);
  isProfileModalOpen = signal<boolean>(false);
  selectedMember = signal<GymMember | null>(null);
  isEditMode = signal<boolean>(false);

  members = computed(() => {
    const status = this.selectedStatus();
    const query = this.searchQuery().toLowerCase();

    return this.allMembers().filter((member) => {
      // Filter by status
      let matchesStatus = true;
      if (status !== 'All') {
        const filterStatus = status.toLowerCase();
        const memberStatus = (member.status || 'Active').toLowerCase();
        
        if (filterStatus === 'inactive') {
          matchesStatus = ['inactive', 'expired', 'cancelled'].includes(memberStatus);
        } else {
          matchesStatus = memberStatus === filterStatus;
        }
      }

      // Filter by query
      let matchesQuery = true;
      if (query) {
        matchesQuery = (member.name || '').toLowerCase().includes(query) ||
          (member.email || '').toLowerCase().includes(query) ||
          (member.phone || '').toLowerCase().includes(query) ||
          (member.status || '').toLowerCase().includes(query);
      }

      return matchesStatus && matchesQuery;
    });
  });

  stats = computed(() => {
    const list = this.allMembers();
    return {
      total: list.length,
      active: list.filter(m => (m.status || '').toLowerCase() === 'active').length,
      pending: list.filter(m => (m.status || '').toLowerCase() === 'pending').length,
      expired: list.filter(m => ['inactive', 'expired', 'cancelled'].includes((m.status || '').toLowerCase())).length
    };
  });

  constructor() { }

  ngOnInit() {
    this.refreshMembers();
  }

  triggerRefresh() {
    this.refreshMembers();
  }

  refreshMembers() {
    this.isLoading.set(true);
    this.error.set(null);

    this.memberService.getMembers()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          console.log('Backend Response:', response);

          // SMART MAPPING: Handles both list of relationships and direct user arrays
          let memberItems: any[] = [];

          if (response && Array.isArray(response.data)) {
            memberItems = response.data;
          } else {
            console.log('Backed error En Member items');
            this.error.set('Could not fetch the members list. Check your connection.');
          }

          const team = memberItems.map((item: any) => {
            const u = item.member; // Exact backend relation

            return {
              id: item.id || item.id_enrollment,
              userId: u?.id_user ?? u?.id,
              name: u?.name && u?.last_name ? `${u.name} ${u.last_name}` : (u?.name || 'Member'),
              email: u?.email || 'N/A',
              phone: u?.phone || 'No phone',
              status: item.status || 'Active',
              id_plan: item.id_plan,
              joinedAt: item.created_at || u?.created_at || new Date().toISOString()
            };
          });

          this.allMembers.set(team);
        },
        error: (err) => {
          console.error('Member loading failed:', err);
          if (err.status === 401) {
            this.error.set('Unauthorized session. Please re-login.');
          } else {
            this.error.set('Could not fetch the members list. Check your connection.');
          }
        }
      });
  }

  onStatusChange(status: string) {
    this.selectedStatus.set(status);
  }

  openAddModal() {
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  onMemberAdded() {
    this.closeAddModal();
    this.triggerRefresh();
  }

  // Profile Modal Logic
  openProfileModal(member: GymMember) {
    this.selectedMember.set(member);
    this.isEditMode.set(false);
    this.isProfileModalOpen.set(true);
  }

  openEdit(member: GymMember) {
    this.selectedMember.set(member);
    this.isEditMode.set(true);
    this.isProfileModalOpen.set(true);
  }

  closeProfileModal() {
    this.isProfileModalOpen.set(false);
    this.selectedMember.set(null);
    this.isEditMode.set(false);
  }

  deleteMember(id: string) {
    if (!id) return;
    this.confirmService.open({
      title: 'Remove Member',
      message: 'Are you completely sure you want to permanently remove this member?',
      confirmText: 'Remove Member',
      icon: 'person_remove',
      isDestructive: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.memberService.deleteMember(id).subscribe({
          next: () => this.triggerRefresh(),
          error: (err) => this.error.set('Operation failed. Check permissions.')
        });
      }
    });
  }
}
