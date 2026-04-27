import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TrainerService } from '../services/trainer.service';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs';
import { TrainerCourseDetailsComponent } from './details/trainer-course-details/trainer-course-details';
import { BroadcastDialogComponent } from '../components/broadcast-dialog/broadcast-dialog.component';

@Component({
  selector: 'app-trainer-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, TrainerCourseDetailsComponent, BroadcastDialogComponent],
  templateUrl: './trainer-courses.component.html',
  styleUrl: './trainer-courses.component.scss',
})
export class TrainerCoursesComponent implements OnInit {
  private trainerService = inject(TrainerService);
  private authService = inject(AuthService);
  private router = inject(Router);

  activeGymId = this.authService.connectedGymId;

  allCourses = signal<any[]>([]);
  searchQuery = signal<string>('');
  selectedType = signal<string>('All');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  selectedCourse = signal<any | null>(null);
  
  broadcastCourse = signal<any | null>(null);
  broadcastMessage = signal<string | null>(null);

  availableTypes = computed(() => {
    const list = this.allCourses();
    const types = new Set<string>();
    list.forEach((c) => types.add(c.type || 'General'));
    return ['All Courses', ...Array.from(types).sort()];
  });

  filteredCourses = computed(() => {
    let list = this.allCourses();
    const query = this.searchQuery().toLowerCase();
    const type = this.selectedType();

    if (type !== 'All Courses' && type !== 'All') {
      list = list.filter((c) => (c.type || 'General') === type);
    }

    if (query) {
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query),
      );
    }
    return list;
  });

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.isLoading.set(true);
    this.error.set(null);
    this.trainerService
      .getCourses()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          if (response && response.data) {
            this.allCourses.set(response.data);
          }
        },
        error: (err) => {
          this.error.set('Could not fetch your assigned courses.');
        },
      });
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.target.value);
  }

  onTypeChange(event: any) {
    this.selectedType.set(event.target.value);
  }

  // Helper: Get enrollment percentage
  getEnrollmentPercentage(course: any): number {
    if (!course.max_capacity || course.max_capacity === 0) return 0;
    return Math.round((course.count / course.max_capacity) * 100);
  }

  // Helper: Get enrollment status (full/warning/available)
  getEnrollmentStatus(course: any): string {
    const percentage = this.getEnrollmentPercentage(course);
    if (percentage >= 100) return 'full';
    if (percentage >= 80) return 'warning';
    return 'available';
  }

  // Helper: Get next session date
  getNextSession(course: any): any {
    if (!course.sessions || course.sessions.length === 0) return null;
    const now = new Date();
    const upcoming = course.sessions.find((s: any) => new Date(s.date_session) > now);
    return upcoming;
  }

  // Helper: Count active/upcoming sessions
  getActiveSessionCount(course: any): number {
    if (!course.sessions) return 0;
    const now = new Date();
    return course.sessions.filter((s: any) => new Date(s.date_session) > now).length;
  }

  // Helper: Get course status
  getCourseStatus(course: any): string {
    const upcomingSessions = this.getActiveSessionCount(course);
    if (upcomingSessions > 0) return 'active';
    if (course.sessions && course.sessions.length > 0) return 'completed';
    return 'inactive';
  }

  // Helper: Format currency
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  }

  // Helper: Format date
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Helper: Calculate attendance rate
  getAttendanceRate(course: any): number {
    if (!course.sessions || course.sessions.length === 0) return 0;
    let totalAttendances = 0;
    let totalExpected = 0;
    course.sessions.forEach((session: any) => {
      if (session.attendances) {
        totalAttendances += session.attendances.filter((a: any) => a.attended).length;
        totalExpected += session.attendances.length;
      }
    });
    if (totalExpected === 0) return 0;
    return Math.round((totalAttendances / totalExpected) * 100);
  }

  // Helper: Get total members in course
  getTotalMembers(course: any): number {
    return course.count || 0;
  }

  // Helper: Get last session date
  getLastSessionDate(course: any): string {
    if (!course.sessions || course.sessions.length === 0) return 'No sessions yet';
    const now = new Date();
    const pastSessions = course.sessions.filter((s: any) => new Date(s.date_session) <= now);
    if (pastSessions.length === 0) return 'No completed sessions';
    // Sort by date descending to get the most recent
    const sorted = pastSessions.sort(
      (a: any, b: any) => new Date(b.date_session).getTime() - new Date(a.date_session).getTime(),
    );
    return this.formatDate(sorted[0].date_session);
  }

  // Helper: Get total completed sessions
  getTotalCompletedSessions(course: any): number {
    if (!course.sessions || course.sessions.length === 0) return 0;
    const now = new Date();
    return course.sessions.filter((s: any) => new Date(s.date_session) <= now).length;
  }

  viewDetails(course: any) {
    this.selectedCourse.set(course);
  }

  closeDetails() {
    this.selectedCourse.set(null);
  }

  viewSessions(course: any) {
    this.router.navigate(['/trainer/sessions'], { queryParams: { q: course.name } });
  }

  viewMembers(course: any) {
    this.router.navigate(['/trainer/members'], { queryParams: { q: course.name } });
  }

  openBroadcast(course: any) {
    this.broadcastCourse.set(course);
  }

  onBroadcastSuccess(message: string) {
    this.broadcastMessage.set(message);
    setTimeout(() => this.broadcastMessage.set(null), 5000);
  }
}
