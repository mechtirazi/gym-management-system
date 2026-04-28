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

  // Pagination signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  lastPage = signal<number>(1);

  // Modal signals
  isAddModalOpen = signal<boolean>(false);
  isProfileModalOpen = signal<boolean>(false);
  selectedMember = signal<GymMember | null>(null);
  isEditMode = signal<boolean>(false);

  members = computed(() => {
    // Current server-side pagination means signals store only current page
    // No frontend filtering here if we want to rely on backend
    return this.allMembers();
  });

  stats = computed(() => {
    const list = this.allMembers();
    return {
      total: this.totalItems(),
      active: list.filter(m => (m.status || '').toLowerCase() === 'active').length,
      pending: list.filter(m => (m.status || '').toLowerCase() === 'pending').length,
      expired: list.filter(m => ['expired', 'cancelled'].includes((m.status || '').toLowerCase())).length
    };
  });

  private calculateMemberStatus(item: any): string {
    const rawStatus = (item.status || 'active').toLowerCase();
    
    // If explicitly cancelled, respect that
    if (rawStatus === 'cancelled') return 'Cancelled';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use enrollment_date as start, and end_date if provided by backend
    const start = new Date(item.enrollment_date || item.start_date);
    start.setHours(0, 0, 0, 0);

    if (today < start) return 'Pending';

    if (item.end_date) {
      const end = new Date(item.end_date);
      end.setHours(0, 0, 0, 0);
      if (today > end) return 'Expired';
    }

    return 'Active';
  }

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

    const filters = {
      status: this.selectedStatus(),
      search: this.searchQuery()
    };

    this.memberService.getMembers(this.currentPage(), this.pageSize(), filters)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          console.log('Backend Response:', response);

          let memberItems: any[] = [];

          if (response && Array.isArray(response.data)) {
            memberItems = response.data;
            this.totalItems.set(response.total || 0);
            this.lastPage.set(response.last_page || 1);
            this.currentPage.set(response.current_page || 1);
          } else if (Array.isArray(response)) {
            memberItems = response;
            this.totalItems.set(response.length);
          }

          const team = memberItems.map((item: any) => {
            const u = item.member; // Exact backend relation

            return {
              id: item.id || item.id_enrollment,
              userId: u?.id_user ?? u?.id,
              name: u?.name && u?.last_name ? `${u.name} ${u.last_name}` : (u?.name || 'Member'),
              email: u?.email || 'N/A',
              phone: u?.phone || 'No phone',
              status: this.calculateMemberStatus(item),
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

  nextPage() {
    if (this.currentPage() < this.lastPage()) {
      this.currentPage.update(p => p + 1);
      this.refreshMembers();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.refreshMembers();
    }
  }

  Math = Math;

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const last = this.lastPage();
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: number[] = [];
    let l: number | undefined;

    range.push(1);
    for (let i = current - delta; i <= current + delta; i++) {
      if (i < last && i > 1) {
        range.push(i);
      }
    }
    if (last > 1) {
      range.push(last);
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push(-1);
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }

  goToPage(page: number) {
    if (page !== this.currentPage()) {
      this.currentPage.set(page);
      this.refreshMembers();
    }
  }

  onStatusChange(status: string) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.refreshMembers();
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.refreshMembers();
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
