import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerService } from '../services/trainer.service';
import { GymMember } from '../../../shared/models/gym-member.model';
import { finalize } from 'rxjs';

interface Stats {
  total: number;
  active: number;
  pending: number;
  expired: number;
}

@Component({
  selector: 'app-trainer-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainer-members.component.html',
  styleUrl: './trainer-members.component.scss'
})
export class TrainerMembersComponent implements OnInit {
  private trainerService = inject(TrainerService);

  private allMembers = signal<GymMember[]>([]);
  private allAttendances = signal<any[]>([]);

  searchQuery = signal<string>('');
  selectedStatus = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Deep Dive State
  selectedMember = signal<any | null>(null);
  attendances = signal<any[]>([]);
  isLoadingDetails = signal<boolean>(false);

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(9);

  filteredMembers = computed(() => {
    const status = this.selectedStatus();
    const query = this.searchQuery().toLowerCase();

    return this.allMembers().filter((member) => {
      let matchesStatus = true;
      if (status !== 'All') {
        const filterStatus = status.toLowerCase();
        const memberStatus = (member.status || 'Active').toLowerCase();
        matchesStatus = memberStatus === filterStatus;
      }

      let matchesQuery = true;
      if (query) {
        matchesQuery = (member.name || '').toLowerCase().includes(query) ||
          (member.email || '').toLowerCase().includes(query);
      }

      return matchesStatus && matchesQuery;
    });
  });

  totalPages = computed(() => Math.ceil(this.filteredMembers().length / this.pageSize()) || 1);

  members = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredMembers().slice(start, start + this.pageSize());
  });

  stats = computed<Stats>(() => {
    const list = this.allMembers();
    return {
      total: list.length,
      active: list.filter(m => (m.status || '').toLowerCase() === 'active').length,
      pending: list.filter(m => (m.status || '').toLowerCase() === 'pending').length,
      expired: list.filter(m => ['inactive', 'expired', 'cancelled'].includes((m.status || '').toLowerCase())).length
    };
  });

  ngOnInit() {
    this.refreshMembers();
  }

  refreshMembers() {
    this.isLoading.set(true);
    this.error.set(null);

    this.trainerService.getAttendances()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          if (response && response.success) {
            const fetchedAttendances = response.data || [];
            this.allAttendances.set(fetchedAttendances);

            const memberMap = new Map<number, any>();
            fetchedAttendances.forEach((a: any) => {
              if (a.member && !memberMap.has(a.member.id_user)) {
                const u = a.member;
                memberMap.set(u.id_user, {
                  id: u.id_user,
                  name: `${u.first_name || u.name} ${u.last_name}`,
                  email: u.email,
                  phone: u.phone || 'No phone',
                  status: u.status || 'Active',
                  joinedAt: u.created_at || u.creation_date
                });
              }
            });
            this.allMembers.set(Array.from(memberMap.values()));
          }
        },
        error: (err) => {
          this.error.set('Could not fetch attendances.');
        }
      });
  }

  viewMemberDetails(member: any) {
    this.selectedMember.set(member);
    this.isLoadingDetails.set(false);
    
    // Filter attendances for this specific member
    const memberAttendances = this.allAttendances().filter(a => a.id_member === member.id);
    this.attendances.set(memberAttendances);
  }

  closeDetails() {
    this.selectedMember.set(null);
    this.attendances.set([]);
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.target.value);
    this.currentPage.set(1);
  }

  onStatusChange(status: string) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

