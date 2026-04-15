import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '../services/member.service';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PaymentModalComponent } from '../../../shared/components/payment-modal/payment-modal.component';

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
  myEnrollmentIds: string[] = [];
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
    const filtered = this.courses.filter(course => {
      const matchesSearch = !this.searchText ||
        course.name?.toLowerCase().includes(this.searchText.toLowerCase()) ||
        course.description?.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesCategory = this.selectedCategory === 'all' ||
        (course.category && course.category.toLowerCase() === this.selectedCategory.toLowerCase());

      const matchesGym = this.selectedGymId === 'all' ||
        course.id_gym === this.selectedGymId;

      return matchesSearch && matchesCategory && matchesGym;
    });

    return filtered;
  }

  get paginatedCourses() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredCourses.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredCourses.length / this.itemsPerPage);
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
      myEnrollments: this.memberService.getMyEnrollments().pipe(catchError(() => of({ data: [] }))),
      mySubscriptions: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (res: any) => {
        const coursesRaw = res.allCourses?.data || [];
        const enrollmentsRaw = res.myEnrollments?.data || [];
        const subscriptionsRaw = res.mySubscriptions?.data || [];

        this.myEnrollmentIds = enrollmentsRaw.map((e: any) => e.id_course);

        // Extract unique gyms from courses that the member has access to
        this.gyms = [];
        const gymIds = new Set();
        subscriptionsRaw.forEach((sub: any) => {
          if (sub.gym && !gymIds.has(sub.gym.id_gym)) {
            gymIds.add(sub.gym.id_gym);
            this.gyms.push(sub.gym);
          }
        });

        this.courses = coursesRaw.map((course: any) => ({
          ...course,
          isOwned: this.myEnrollmentIds.includes(course.id_course),
          gymName: course.gym?.name || 'Local Hub',
          gymLogo: course.gym?.logo_url || `https://ui-avatars.com/api/?name=${course.gym?.name || 'Gym'}&background=8b5cf6&color=fff`,
          duration: course.duration || '0',
          members_count: course.count || 0,
          category: course.goal || 'Fitness'
        }));

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

  onEnroll(course: any): void {
    if (course.isOwned) return;

    this.selectedCourse = course;
    this.showPaymentModal = true;
    this.cdr.detectChanges();
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
      this.memberService.enrollInCourse(this.selectedCourse.id_course).subscribe({
        next: (res: any) => {
          console.log('ENROLL SUCCESS:', res);
          this.handleSuccess();
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
              this.memberService.enrollInCourse(this.selectedCourse.id_course, 'credit_card').subscribe({
                next: () => this.handleSuccess(),
                error: (err) => this.handleError(err)
              });
            }
          });
        },
        error: (err) => this.handleError(err)
      });
    }
  }

  private handleSuccess() {
    this.processingPayment = false;
    this.closePaymentModal();
    this.loadData();
    this.cdr.detectChanges();
  }

  private handleError(err: any) {
    console.error('PURCHASE FAILURE:', err);
    this.paymentError = err.error?.message || 'Access synchronization failed.';
    this.processingPayment = false;
    this.cdr.detectChanges();
  }
}
