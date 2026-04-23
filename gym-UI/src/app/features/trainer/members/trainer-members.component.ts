import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TrainerService } from '../services/trainer.service';
import { AuthService } from '../../../core/services/auth.service';
import { GymMember } from '../../../shared/models/gym-member.model';
import { GymInfo } from '../../../core/services/gym.service';
import { finalize } from 'rxjs';

interface Stats {
  total: number;
  active: number;
  pending: number;
  expired: number;
}

interface TrainerClient extends GymMember {
  courses: string[];
  latestPayment?: any;
}

interface DirectMessageForm {
  title: string;
  text: string;
  type: 'info' | 'warning';
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
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  activeGymId = this.authService.connectedGymId;
  gymStatus = this.authService.connectedGymStatus;
  suspensionReason = this.authService.connectedGymSuspensionReason;

  private allMembers = signal<TrainerClient[]>([]);
  private allAttendances = signal<any[]>([]);

  searchQuery = signal<string>('');
  selectedStatus = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  attendanceAccessError = signal<string | null>(null);

  // Deep Dive State
  selectedMember = signal<any | null>(null);
  attendances = signal<any[]>([]);
  isLoadingDetails = signal<boolean>(false);
  isSendingMessage = signal<boolean>(false);
  messageError = signal<string | null>(null);
  messageSuccess = signal<string | null>(null);
  directMessage = signal<DirectMessageForm>({
    title: 'Message from your coach',
    text: '',
    type: 'info'
  });

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
          (member.email || '').toLowerCase().includes(query) ||
          (Array.isArray(member.courses) && member.courses.some((c: string) => c.toLowerCase().includes(query)));
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
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery.set(params['q']);
      }
    });
    this.refreshMembers();
  }


  refreshMembers() {
    this.isLoading.set(true);
    this.error.set(null);
    this.attendanceAccessError.set(null);
    this.allMembers.set([]);
    this.allAttendances.set([]);

    if (this.gymStatus() === 'suspended') {
      this.error.set(
        this.suspensionReason()
          ? `Client management is unavailable for this gym right now: ${this.suspensionReason()}`
          : 'Client management is unavailable while the selected gym is suspended.'
      );
      this.attendanceAccessError.set(
        this.suspensionReason()
          ? `Attendance history is unavailable for this gym right now: ${this.suspensionReason()}`
          : 'Attendance history is unavailable while the selected gym is suspended.'
      );
      this.isLoading.set(false);
      return;
    }

    // 1. Fetch all assigned members (Clients)
    this.trainerService.getClients().subscribe({
      next: (res: any) => {
        if (res && res.success) {
          const members = (res.data || []).map((u: any) => {
            const enrollments = u.enrollments || [];
            const courses = enrollments.map((e: any) => e.course?.name).filter((name: any) => !!name);
            
            const coursePayments = enrollments.map((e: any) => e.latest_course_payment).filter((p: any) => !!p);
            const latestPayment = coursePayments.length > 0 ? coursePayments[0] : null;

            return {
              id: u.id_user,
              id_user: u.id_user,
              name: `${u.first_name || u.name || ''} ${u.last_name || ''}`.trim() || 'No Name',
              email: u.email,
              phone: u.phone || 'No phone',
              status: u.status || 'Active',
              joinedAt: u.created_at || u.creation_date,
              avatar: u.profile_picture ? `storage/${u.profile_picture}` : null,
              courses,
              latestPayment
            };
          });
          this.allMembers.set(members);
        }
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 403) {
          this.error.set(
            err.error?.reason
              ? `Client management is unavailable for this gym right now: ${err.error.reason}`
              : 'Client management is unavailable for the selected gym right now.'
          );
          return;
        }

        this.error.set('Could not fetch members.');
      }
    });

    // 2. Fetch all attendances in background for the detail "Deep Dive" view
    this.trainerService.getAttendances()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          if (response && response.success) {
            this.allAttendances.set(response.data || []);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.allAttendances.set([]);

          if (err.status === 403) {
            this.attendanceAccessError.set(
              err.error?.reason
                ? `Attendance history is unavailable for this gym right now: ${err.error.reason}`
                : 'Attendance history is unavailable for the selected gym right now.'
            );
            return;
          }

          console.error('Could not fetch attendances:', err);
        }
      });
  }

  viewMemberDetails(member: any) {
    this.selectedMember.set(member);
    this.isLoadingDetails.set(false);
    this.messageError.set(null);
    this.messageSuccess.set(null);
    this.directMessage.set({
      title: `Message for ${member.name}`,
      text: '',
      type: 'info'
    });
    
    // Filter attendances for this specific member
    const memberAttendances = this.allAttendances().filter(a => a.id_member === member.id);
    this.attendances.set(memberAttendances);
  }

  closeDetails() {
    this.selectedMember.set(null);
    this.attendances.set([]);
    this.messageError.set(null);
    this.messageSuccess.set(null);
  }

  updateDirectMessage(field: keyof DirectMessageForm, value: string) {
    this.directMessage.set({
      ...this.directMessage(),
      [field]: value
    });
  }

  sendMessage() {
    const member = this.selectedMember();
    const form = this.directMessage();

    if (!member?.id || !form.text.trim()) {
      this.messageError.set('Write a short message before sending.');
      return;
    }

    this.isSendingMessage.set(true);
    this.messageError.set(null);
    this.messageSuccess.set(null);

    this.trainerService.sendDirectMessage(member.id, {
      title: form.title.trim() || 'Message from your coach',
      text: form.text.trim(),
      type: form.type
    }).subscribe({
      next: () => {
        this.isSendingMessage.set(false);
        this.messageSuccess.set('Message sent successfully.');
        this.directMessage.set({
          ...this.directMessage(),
          text: ''
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isSendingMessage.set(false);
        this.messageError.set(err.error?.message || 'Could not send the message.');
      }
    });
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

