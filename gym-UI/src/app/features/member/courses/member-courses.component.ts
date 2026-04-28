import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-member-courses',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PaymentModalComponent],
  templateUrl: './member-courses.component.html',
  styleUrl: './member-courses.component.scss'
})
export class MemberCoursesComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  courses: any[] = [];
  gyms: any[] = [];
  myPaidSessionIds: string[] = [];
  reservedSessionIds: string[] = [];
  loading = true;
  errorMessage = '';

  // Filter & Pagination State
  searchText = '';
  selectedCategory = 'all';
  selectedGymId = 'all';
  currentPage = 1;
  itemsPerPage = 6;

  // Payment UI State
  showPaymentModal = false;
  selectedCourse: any = null;
  processingPayment = false;
  paymentError: string | null = null;
  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI';

  categories = [
    { id: 'all', label: 'All Programs' },
    { id: 'Strength', label: 'Strength' },
    { id: 'Cardio', label: 'Cardio' },
    { id: 'Yoga', label: 'Mind & Body' },
    { id: 'HIIT', label: 'HIIT' }
  ];

  get filteredCourses() {
    return this.courses.filter(course => {
      const matchesSearch = !this.searchText ||
        course.name?.toLowerCase().includes(this.searchText.toLowerCase()) ||
        course.description?.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesCategory = this.selectedCategory === 'all' ||
        (course.category && course.category.toLowerCase() === this.selectedCategory.toLowerCase());

      const matchesGym = this.selectedGymId === 'all' ||
        course.id_gym === this.selectedGymId;

      return matchesSearch && matchesCategory && matchesGym;
    });
  }

  get paginatedCourses() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredCourses.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredCourses.length / this.itemsPerPage) || 1;
  }

  changePage(page: number) {
    this.currentPage = page;
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatDuration(val: any): string {
    if (!val) return '0 WEEKS';
    const s = val.toString().toUpperCase();
    if (s.includes('WEEK') || s.includes('MONTH') || s.includes('MIN')) {
      return s;
    }
    return `${s} WEEKS`;
  }

  onFilterChange() {
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      allCourses: this.memberService.getAvailableCourses().pipe(catchError(() => of({ data: [] }))),
      myPayments: this.memberService.getMyPayments().pipe(catchError(() => of({ data: [] }))),
      mySubscriptions: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] }))),
      myAttendances: this.memberService.getMyAttendances().pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (res: any) => {
        const coursesRaw = res.allCourses?.data || [];
        const paymentsRaw = res.myPayments?.data || [];
        const subscriptionsRaw = res.mySubscriptions?.data || [];
        const attendancesRaw = res.myAttendances?.data || [];

        // Check session-level ownership through payment history
        this.myPaidSessionIds = paymentsRaw
          .filter((p: any) => p.type === 'course' && p.id_session)
          .map((p: any) => p.id_session);

        // Store sessions the member has officially reserved
        this.reservedSessionIds = attendancesRaw.map((a: any) => a.id_session || a.session?.id_session).filter((id: any) => !!id);

        // Extract unique gyms
        this.gyms = [];
        const gymIds = new Set();
        subscriptionsRaw.forEach((sub: any) => {
          if (sub.gym && !gymIds.has(sub.gym.id_gym)) {
            gymIds.add(sub.gym.id_gym);
            this.gyms.push(sub.gym);
          }
        });

        this.courses = coursesRaw.map((course: any) => {
          // Resolve correct image URL
          let imageUrl = course.image_url || course.image;
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
            const cleanPath = imageUrl.replace(/^\//, '');
            imageUrl = `${baseUrl}/${cleanPath}`;
          }

          // Gather valid sessions
          const activeSessions = course.sessions?.filter((s: any) => s.status !== 'completed' && s.status !== 'cancelled') || [];
          
          // Determine the most accurate trainer data
          const primaryTrainer = activeSessions.length > 0 ? activeSessions[0]?.trainer : (course.trainer || null);
          const tName = primaryTrainer?.user?.name || primaryTrainer?.name || course.trainer?.name || 'Master Coach';
          const tAvatar = primaryTrainer?.user?.avatar || primaryTrainer?.avatar || course.trainer?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tName)}&background=00d2ff&color=fff&bold=true`;

          return {
            ...course,
            id_course: course.id_course || course.id,
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=600',
            gymName: course.gym?.name || 'Local Hub',
            gymLogo: course.gym?.logo_url || `https://ui-avatars.com/api/?name=${course.gym?.name || 'Gym'}&background=8b5cf6&color=fff`,
            duration: course.duration || '0',
            members_count: course.enrolled_members_count || course.count || 0,
            max_capacity: course.max_capacity || 20,
            activeSessions: activeSessions,
            hasActiveSession: activeSessions.length > 0,
            selectedSessionId: activeSessions.length > 0 ? activeSessions[0].id_session || activeSessions[0].id : null,
            displayTrainerName: tName,
            displayTrainerAvatar: tAvatar,
            isOwned: activeSessions.some((s: any) => this.myPaidSessionIds.includes(s.id_session || s.id))
          };
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Course Hub Sync Error', err);
        this.errorMessage = 'Could not sync training programs.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onReserve(course: any): void {
    if (course.hasActiveSession && !course.selectedSessionId) {
      alert('Please select a session to reserve.');
      return;
    }

    this.selectedCourse = course;

    // In 'Pay Per Session' model, we always trigger payment modal unless already reserved/paid
    if (this.isSessionReserved(course)) {
      alert('You have already reserved this timeslot.');
      return;
    }

    if (!course.price || parseFloat(course.price) <= 0) {
      this.completeFreeCourseEnrollment();
      return;
    }

    // Require payment/enrollment for this specific session
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  private completeFreeCourseEnrollment() {
    if (!this.selectedCourse) return;
    this.processingPayment = true;
    this.cdr.detectChanges();

    const courseId = this.selectedCourse.id_course || this.selectedCourse.id;
    const sessionId = this.selectedCourse.selectedSessionId;
    
    this.memberService.enrollInCourse(courseId, sessionId, 'free').subscribe({
      next: () => {
        this.handleSuccess('Session Secured Successfully!');
      },
      error: (err: any) => this.handleError(err)
    });
  }

  private executeReservation(course: any) {
    if (!course.selectedSessionId) {
      alert('Please select a specific timeslot first.');
      return;
    }
    this.processingPayment = true;
    this.cdr.detectChanges();

    this.memberService.reserveSession(course.selectedSessionId).subscribe({
      next: () => {
        this.handleSuccess('Reservation successful! Marked as pending in attendance.');
      },
      error: (err) => this.handleError(err)
    });
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedCourse = null;
    this.cdr.detectChanges();
  }

  completePurchase(event: any) {
    if (!this.selectedCourse) return;

    this.processingPayment = true;
    this.paymentError = null;
    this.cdr.detectChanges();

    if (event.method === 'zen_wallet') {
      const courseId = this.selectedCourse.id_course || this.selectedCourse.id;
      const sessionId = this.selectedCourse.selectedSessionId;
      this.memberService.enrollInCourse(courseId, sessionId).subscribe({
        next: () => {
          this.handleSuccess('Session Secured Successfully!');
        },
        error: (err: any) => this.handleError(err)
      });
    } else {
      const amount = this.selectedCourse.price ? parseFloat(this.selectedCourse.price) : 49.99;
      // Stripe Flow
      this.memberService.createPaymentIntent(this.selectedCourse.id_gym, amount).subscribe({
        next: (res: any) => {
          event.stripe.confirmCardPayment(res.client_secret, {
            payment_method: { card: event.card }
          }).then((result: any) => {
            if (result.error) {
              this.handleError({ error: { message: result.error.message } });
            } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
              const courseId = this.selectedCourse.id_course || this.selectedCourse.id;
              const sessionId = this.selectedCourse.selectedSessionId;
              this.memberService.enrollInCourse(courseId, sessionId, 'credit_card').subscribe({
                next: () => {
                  this.handleSuccess('Session Secured Successfully!');
                },
                error: (err) => this.handleError(err)
              });
            }
          });
        },
        error: (err) => this.handleError(err)
      });
    }
  }

  private handleSuccess(msg = 'Transaction successful!') {
    this.processingPayment = false;
    this.paymentError = null;
    this.closePaymentModal();
    alert(msg);
    this.loadData();
  }

  private handleError(err: any) {
    console.error('TRANSACTION FAILURE:', err);
    const msg = err.error?.message || 'Access synchronization failed.';
    this.paymentError = msg;
    this.processingPayment = false;
    this.cdr.detectChanges();
    if (!this.showPaymentModal) {
      alert('Error: ' + msg);
    }
  }

  getTrainerName(course: any): string {
    if (!course) return 'Master Coach';
    const session = course.activeSessions?.find((s: any) => (s.id_session || s.id) === course.selectedSessionId);
    const trainer = session?.trainer || course.trainer;
    return trainer?.name || trainer?.user?.name || 'Master Coach';
  }

  getTrainerAvatar(course: any): string {
    if (!course) return 'https://ui-avatars.com/api/?name=Master+Coach&background=00d2ff&color=fff&bold=true';
    const session = course.activeSessions?.find((s: any) => (s.id_session || s.id) === course.selectedSessionId);
    const trainer = session?.trainer || course.trainer;
    const tName = trainer?.name || trainer?.user?.name || 'Master Coach';
    return trainer?.avatar || trainer?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tName)}&background=00d2ff&color=fff&bold=true`;
  }

  isSessionReserved(course: any): boolean {
    return !!course.selectedSessionId && this.reservedSessionIds.includes(course.selectedSessionId);
  }

  getSelectedSessionCapacity(course: any): string {
    if (!course.selectedSessionId && course.activeSessions?.length === 0) return 'N/A';
    
    // If no session selected yet but sessions exist, default to the first one's data
    const targetId = course.selectedSessionId || (course.activeSessions?.length > 0 ? (course.activeSessions[0].id_session || course.activeSessions[0].id) : null);
    
    const session = course.activeSessions?.find((s: any) => (s.id_session || s.id) === targetId);
    const enrolled = session?.attendances_count || 0;
    const max = session?.max_capacity || course.max_capacity || 20;
    return `${enrolled} / ${max}`;
  }

  isSessionFull(course: any): boolean {
    const targetId = course.selectedSessionId || (course.activeSessions?.length > 0 ? (course.activeSessions[0].id_session || course.activeSessions[0].id) : null);
    const session = course.activeSessions?.find((s: any) => (s.id_session || s.id) === targetId);
    if (!session) return false;
    const enrolled = session.attendances_count || 0;
    const max = session.max_capacity || course.max_capacity || 20;
    return enrolled >= max;
  }
}
