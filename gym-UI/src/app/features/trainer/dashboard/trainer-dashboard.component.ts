import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TrainerService } from '../services/trainer.service';
import { GymService, GymInfo } from '../../../core/services/gym.service';
import { interval, Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './trainer-dashboard.component.html',
  styleUrl: './trainer-dashboard.component.scss'
})
export class TrainerDashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private trainerService = inject(TrainerService);
  private gymService = inject(GymService);
  private timerSub?: Subscription;

  trainerName = signal<string>(this.authService.currentUser()?.name || 'Trainer');
  assignedGyms = signal<GymInfo[]>([]);
  activeGymId = computed(() => this.authService.connectedGymId());

  stats = signal<any>({ activeClients: 0, activeClientsTrend: '+0', sessionsToday: 0, completedToday: 0, rating: 0, ratingTrend: '0.0' });
  upcomingSessions = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  // Broadcast Logic
  isBroadcastModalOpen = signal<boolean>(false);
  broadcastForm = signal<any>({ title: '', message: '', type: 'info' });
  isSendingBroadcast = signal<boolean>(false);

  // Add Member Logic
  isAddMemberModalOpen = signal<boolean>(false);
  memberForm = signal<any>({ first_name: '', last_name: '', email: '', phone: '', password: 'Password123' });
  isSavingMember = signal<boolean>(false);

  currentTime = signal<Date>(new Date());

  nextSession = computed(() => {
    const sessions = this.upcomingSessions();
    return sessions.length > 0 ? sessions[0] : null;
  });

  limitedSessions = computed(() => {
    return this.upcomingSessions().slice(0, 5);
  });

  countdown = computed(() => {
    const next = this.nextSession();
    if (!next) return null;

    const now = this.currentTime().getTime();
    const sessionDate = new Date(`${next.date_session}T${next.start_time}`).getTime();
    const diff = sessionDate - now;

    if (diff <= 0) return 'Session Started';

    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    return hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
  });

  ngOnInit() {
    this.loadAssignedGyms();
    this.loadDashboardData();
    this.timerSub = interval(60000).subscribe(() => this.currentTime.set(new Date()));
  }

  loadAssignedGyms() {
    this.gymService.getMyGyms().subscribe(gyms => {
      this.assignedGyms.set(gyms);
    });
  }

  onGymChange(event: any) {
    const gymId = event.target.value;
    if (gymId) {
      const selectedGym = this.assignedGyms().find(g => g.id_gym === gymId);
      this.authService.switchGym(gymId, selectedGym?.status, selectedGym?.suspension_reason);
    }
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
  }

  loadDashboardData() {
    this.isLoading.set(true);

    this.trainerService.getDashboardStats().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.stats.set(res.data);
        }
      }
    });

    this.trainerService.getUpcomingSessions().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.upcomingSessions.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openBroadcast() {
    this.isBroadcastModalOpen.set(true);
  }

  closeBroadcast() {
    this.isBroadcastModalOpen.set(false);
    this.broadcastForm.set({ title: '', message: '', type: 'info' });
  }

  sendBroadcast() {
    const form = this.broadcastForm();
    if (!form.message || !form.title) return;

    this.isSendingBroadcast.set(true);

    this.trainerService.sendBroadcast(form).subscribe({
      next: (res) => {
        this.isSendingBroadcast.set(false);
        this.closeBroadcast();
        alert('Broadcast sent successfully!');
      },
      error: (err) => {
        this.isSendingBroadcast.set(false);
        alert(err.error?.message || 'Failed to send broadcast.');
      }
    });
  }

  openAddMember() {
    this.isAddMemberModalOpen.set(true);
  }

  closeAddMember() {
    this.isAddMemberModalOpen.set(false);
    this.memberForm.set({ first_name: '', last_name: '', email: '', phone: '', password: 'Password123' });
  }

  saveMember() {
    const data = this.memberForm();
    if (!data.first_name || !data.email) return;

    this.isSavingMember.set(true);
    const gymId = this.authService.connectedGymId();
    this.trainerService.createClient({ ...data, id_gym: gymId }).subscribe({
      next: () => {
        this.isSavingMember.set(false);
        this.closeAddMember();
        alert('Member added successfully!');
        this.loadDashboardData();
      },
      error: (err) => {
        this.isSavingMember.set(false);
        alert(err.error?.message || 'Error adding member.');
      }
    });
  }

  updateBroadcastForm(field: string, value: any) {
    this.broadcastForm.set({ ...this.broadcastForm(), [field]: value });
  }

  updateMemberForm(field: string, value: any) {
    this.memberForm.set({ ...this.memberForm(), [field]: value });
  }

  getAttendanceProgress(session: any): number {
    const capacity = session.course?.max_capacity || 20;
    return session.attendances_count ? (session.attendances_count / capacity) * 100 : 0;
  }
}
