import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ReceptionistAttendanceService, SessionDto, AttendanceDto } from './receptionist-attendance.service';
import { MemberService } from '../../../owner/member/services/member.service';
import { GymMember } from '../../../../shared/models/gym-member.model';

@Component({
  selector: 'app-receptionist-attendance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './receptionist-attendance.component.html',
  styleUrl: './receptionist-attendance.component.scss'
})
export class ReceptionistAttendanceComponent {
  private fb = inject(FormBuilder);
  private service = inject(ReceptionistAttendanceService);
  private memberService = inject(MemberService);

  isLoading = signal(false);
  error = signal<string | null>(null);

  sessions = signal<SessionDto[]>([]);
  selectedSessionId = signal<string>('');
  members = signal<GymMember[]>([]);

  attendances = signal<AttendanceDto[]>([]);
  attendanceByMemberId = computed(() => {
    const map = new Map<string, AttendanceDto>();
    for (const a of this.attendances()) map.set(a.id_member, a);
    return map;
  });

  form = this.fb.group({
    id_member: ['', Validators.required],
    status: ['present' as 'present' | 'late' | 'absent', Validators.required]
  });

  constructor() {
    this.loadSessions();
    this.loadMembers();
  }

  loadMembers() {
    this.memberService.getMembers(1, 1000).subscribe({
      next: (response: any) => {
        const memberItems = response.data || [];
        const team = memberItems.map((item: any) => {
          const u = item.member;
          return {
            id: item.id || item.id_enrollment,
            userId: u?.id_user ?? u?.id,
            name: (u?.name && u?.last_name) ? `${u.name} ${u.last_name}` : (u?.name || 'Member'),
            email: u?.email || 'N/A',
            phone: u?.phone || 'No phone',
            status: item.status || 'Active',
            joinedAt: item.created_at || u?.created_at || new Date().toISOString()
          } as GymMember;
        });
        this.members.set(team);
      }
    });
  }

  loadSessions() {
    this.isLoading.set(true);
    this.error.set(null);
    this.service
      .listSessions()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (list) => this.sessions.set(list),
        error: () => this.error.set('Could not load sessions.')
      });
  }

  selectSession(id_session: string) {
    this.selectedSessionId.set(id_session);
    this.refreshAttendances();
  }

  refreshAttendances() {
    const sessionId = this.selectedSessionId();
    if (!sessionId) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.service
      .listAttendancesBySession(sessionId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (list) => this.attendances.set(list),
        error: () => this.error.set('Could not load attendances for this session.')
      });
  }

  upsertAttendanceForMember(memberId: string, status: 'present' | 'late' | 'absent') {
    const sessionId = this.selectedSessionId();
    if (!sessionId) return;

    const existing = this.attendanceByMemberId().get(memberId);
    this.isLoading.set(true);
    this.error.set(null);

    const req$ = existing
      ? this.service.updateAttendance(existing.id_attendance, { status })
      : this.service.createAttendance({ id_member: memberId, id_session: sessionId, status });

    req$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => this.refreshAttendances(),
      error: (err) => this.error.set(err?.error?.message || 'Operation failed. Check permissions/validation.')
    });
  }

  quickAdd() {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const sessionId = this.selectedSessionId();
    if (!sessionId) {
      this.error.set('Select a session first.');
      return;
    }

    const { id_member, status } = this.form.getRawValue();
    this.upsertAttendanceForMember(id_member!, status!);
    this.form.reset({ id_member: '', status: 'present' });
  }
}

