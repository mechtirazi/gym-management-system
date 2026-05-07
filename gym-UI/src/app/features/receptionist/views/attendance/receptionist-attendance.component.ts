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
  viewMode = signal<'courses' | 'events'>('courses');
  
  courses = signal<any[]>([]);
  selectedCourseId = signal<string>('');

  events = signal<any[]>([]);
  selectedEventId = signal<string>('');

  sessions = signal<SessionDto[]>([]);
  selectedSessionId = signal<string>('');
  members = signal<GymMember[]>([]);
  searchTerm = signal<string>('');
  
  filteredMembers = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.members();
    return this.members().filter(m => 
      (m.name?.toLowerCase().includes(term) || false) || 
      (m.email?.toLowerCase().includes(term) || false) || 
      (m.phone?.toLowerCase().includes(term) || false)
    );
  });

  attendances = signal<any[]>([]);
  attendanceByMemberId = computed(() => {
    const map = new Map<string, any>();
    for (const a of this.attendances()) {
      // Course attendance has id_member, event attendance also has id_member
      map.set(a.id_member, a);
    }
    return map;
  });

  form = this.fb.group({
    id_member: ['', Validators.required],
    status: ['pending' as 'present' | 'late' | 'absent' | 'pending', Validators.required]
  });

  constructor() {
    this.syncAll();
  }

  syncAll() {
    this.isLoading.set(true);
    this.loadCourses();
    this.loadEvents();
    this.loadMembers();
    // Reset loading after a short delay to allow both requests to start
    setTimeout(() => this.isLoading.set(false), 1000);
  }

  setMode(mode: 'courses' | 'events') {
    this.viewMode.set(mode);
    this.selectedCourseId.set('');
    this.selectedEventId.set('');
    this.selectedSessionId.set('');
    this.attendances.set([]);
    this.sessions.set([]);
    this.members.set([]);
  }

  loadCourses() {
    this.service
      .listCourses()
      .subscribe({
        next: (list) => this.courses.set(list),
        error: () => this.error.set('Could not load courses.')
      });
  }

  loadEvents() {
    this.service
      .listEvents()
      .subscribe({
        next: (list) => {
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          const todaysEvents = list.filter((e: any) => {
            if (!e.start_date) return false;
            
            const start = new Date(e.start_date);
            const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            
            const end = e.end_date ? new Date(e.end_date) : start;
            const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

            return todayStr >= startStr && todayStr <= endStr;
          });
          
          this.events.set(todaysEvents);
        },
        error: () => this.error.set('Could not load events.')
      });
  }

  loadMembers() {
    this.service.listSubscriptions().subscribe({
      next: (subscriptions: any[]) => {
        const uniqueMembers = new Map<string, GymMember>();
        
        subscriptions.forEach((sub: any) => {
          const u = sub.user;
          if (!u) return;

          const email = (u.email || '').toLowerCase().trim();
          const fullName = `${u.name || ''} ${u.last_name || ''}`.toLowerCase().trim();
          const compositeKey = `${fullName}-${email}`;
          
          if (email && !uniqueMembers.has(compositeKey)) {
            uniqueMembers.set(compositeKey, {
              id: sub.id_subscribe,
              userId: u.id_user ?? u.id,
              name: (u.name && u.last_name) ? `${u.name} ${u.last_name}` : (u.name || 'Member'),
              email: u.email,
              phone: u.phone || 'No phone',
              status: sub.status || 'Active',
              joinedAt: sub.created_at || new Date().toISOString()
            } as GymMember);
          }
        });
        
        this.members.set(Array.from(uniqueMembers.values()));
      }
    });
  }

  selectCourse(id_course: string) {
    this.selectedCourseId.set(id_course);
    this.selectedSessionId.set('');
    this.attendances.set([]);
    this.sessions.set([]);
    this.members.set([]);
    
    if (id_course) {
      this.loadSessionsForCourse(id_course);
      this.loadMembers();
    }
  }

  selectEvent(id_event: string) {
    this.selectedEventId.set(id_event);
    this.attendances.set([]);
    this.members.set([]);
    
    if (id_event) {
      this.loadAttendancesForEvent(id_event);
      this.loadMembers();
    }
  }

  loadSessionsForCourse(courseId: string) {
    this.isLoading.set(true);
    this.error.set(null);
    
    const today = new Date().toISOString().split('T')[0];
    this.service
      .listSessions({ id_course: courseId, date_session: today })
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
    if (this.viewMode() === 'courses') {
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
    } else {
      const eventId = this.selectedEventId();
      if (eventId) this.loadAttendancesForEvent(eventId);
    }
  }

  loadAttendancesForEvent(eventId: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.service
      .listAttendancesByEvent(eventId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (list) => this.attendances.set(list),
        error: () => this.error.set('Could not load attendances for this event.')
      });
  }

  upsertAttendanceForMember(memberId: string, status: any) {
    this.isLoading.set(true);
    this.error.set(null);

    if (this.viewMode() === 'courses') {
      const sessionId = this.selectedSessionId();
      if (!sessionId) return;

      const existing = this.attendanceByMemberId().get(memberId);
      const req$ = existing
        ? this.service.updateAttendance(existing.id_attendance, { status })
        : this.service.createAttendance({ id_member: memberId, id_session: sessionId, status });

      req$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
        next: () => this.refreshAttendances(),
        error: (err) => this.error.set(err?.error?.message || 'Operation failed.')
      });
    } else {
      const eventId = this.selectedEventId();
      if (!eventId) return;

      const existing = this.attendanceByMemberId().get(memberId);
      // For events, we use the status provided or 'completed' as default for present
      const eventStatus = status === 'present' ? 'completed' : 
                         (status === 'absent' ? 'cancelled' : 
                         (status === 'late' ? 'ongoing' : 
                         (status === 'pending' ? 'upcoming' : status)));

      const id_attendance = existing?.id_attendance_event || existing?.id;

      const req$ = existing
        ? this.service.updateEventAttendance(id_attendance, { status: eventStatus })
        : this.service.createEventAttendance({ id_member: memberId, id_event: eventId, status: eventStatus });

      req$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
        next: () => this.refreshAttendances(),
        error: (err) => this.error.set(err?.error?.message || 'Operation failed.')
      });
    }
  }

  quickAdd() {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.viewMode() === 'courses' && !this.selectedSessionId()) {
      this.error.set('Select a session first.');
      return;
    }
    if (this.viewMode() === 'events' && !this.selectedEventId()) {
      this.error.set('Select an event first.');
      return;
    }

    const { id_member } = this.form.getRawValue();
    this.upsertAttendanceForMember(id_member!, 'pending');
    this.form.reset({ id_member: '', status: 'pending' });
    this.searchTerm.set('');
  }
}

