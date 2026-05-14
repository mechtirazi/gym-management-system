import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ReceptionistPaymentsService, PaymentDto } from './receptionist-payments.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MemberService } from '../../../owner/member/services/member.service';
import { GymMember } from '../../../../shared/models/gym-member.model';
import { ProductService } from '../../../owner/products/services/product.service';
import { MembershipPlanService, MembershipPlan } from '../../../owner/services/membership-plan.service';
import { CourseService } from '../../../owner/courses/services/course.service';
import { SessionService } from '../../../owner/courses/services/session.service';
import { EventService } from '../../../owner/events/services/event.service';
import { NutritionService } from '../../../owner/nutrition/services/nutrition.service';

@Component({
  selector: 'app-receptionist-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './receptionist-payments.component.html',
  styleUrl: './receptionist-payments.component.scss'
})
export class ReceptionistPaymentsComponent {
  private fb = inject(FormBuilder);
  private paymentsService = inject(ReceptionistPaymentsService);
  private authService = inject(AuthService);
  private memberService = inject(MemberService);
  private productService = inject(ProductService);
  private planService = inject(MembershipPlanService);
  private courseService = inject(CourseService);
  private sessionService = inject(SessionService);
  private eventService = inject(EventService);
  private nutritionService = inject(NutritionService);

  isLoading = signal(false);
  error = signal<string | null>(null);

  payments = signal<PaymentDto[]>([]);
  members = signal<GymMember[]>([]);
  plans = signal<MembershipPlan[]>([]);
  products = signal<any[]>([]);
  courses = signal<any[]>([]);
  sessions = signal<any[]>([]);
  events = signal<any[]>([]);
  nutritionPlans = signal<any[]>([]);
  selectedPayment = signal<PaymentDto | null>(null);

  // Member Search State
  memberSearchTerm = signal('');
  filteredMembers = computed(() => {
    const term = this.memberSearchTerm().toLowerCase().trim();
    const selectedId = this.form.get('id_user')?.value;
    const allMembers = this.members();

    if (!term) return allMembers;

    const searchWords = term.split(/\s+/);

    return allMembers.filter(m => {
      const fullName = (m.name || '').toLowerCase();
      const email = (m.email || '').toLowerCase();

      const matchesSearch = searchWords.every(word =>
        fullName.includes(word) || email.includes(word)
      );

      const isSelected = m.userId === selectedId;
      return matchesSearch || isSelected;
    });
  });

  // Pagination State
  currentPage = signal(1);
  lastPage = signal(1);
  totalItems = signal(0);
  perPage = 8;

  // Filter State
  startDate = signal<string>('');
  endDate = signal<string>('');
  statusFilter = signal<string>('');
  gatewayFilter = signal<string>('');
  searchQuery = signal<string>('');
  private searchSubject = new Subject<string>();
  private memberSearchSubject = new Subject<string>();
  private paymentsRequestId = 0;
  private paymentsPageCache = new Map<string, { response: any; timestamp: number }>();
  private readonly paymentsCacheTtlMs = 45000;

  // Metrics State
  financialSummary = signal<any>(null);
  totalRevenue = signal(0);

  // Current Gym Context
  currentGymId = computed(() => this.authService.connectedGymId());

  // Form for processing new payments (simplified)
  showNewPaymentForm = signal(false);
  form = this.fb.group({
    id_user: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    method: ['', Validators.required],
    type: ['membership'],
    id_product: [''],
    id_plan: [''],
    id_course: [''],
    course_payment_type: ['session'],
    id_session: [''],
    id_event: [''],
    id_nutrition: [''],
    id_transaction: [''],
    start_date: [new Date().toISOString().split('T')[0], Validators.required]
  });

  // Duplicate check state
  isDuplicate = signal(false);
  duplicateMessage = signal('');

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(val => {
      this.searchQuery.set(val);
      this.refresh(true);
    });

    this.memberSearchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(val => {
      this.loadMembers(val);
    });

    effect(() => {
      if (this.currentGymId()) {
        this.clearPaymentsCache();
        this.refresh();
        this.loadMembers();
        this.loadProducts();
        this.loadPlans();
        this.loadCourses();
        this.loadNutritionPlans();
      }
    });

    // Watch for duplicate payments
    this.form.valueChanges.subscribe(() => {
      this.checkPotentialDuplicate();
    });

    this.form.get('type')?.valueChanges.subscribe(type => {
      if (type === 'event') {
        this.loadAllEvents();
      } else if (type === 'course') {
        this.sessions.set([]); // Clear sessions until a course is picked
      } else if (type === 'nutrition') {
        this.loadNutritionPlans();
      }
    });
  }

  todayDate = new Date().toISOString().split('T')[0];

  selectMember(m: GymMember) {
    this.form.patchValue({ id_user: m.userId || '' });
    this.memberSearchTerm.set('');
    // Focus or other UX improvements can go here
  }

  loadMembers(search?: string) {
    this.memberService.getUsers(1, 100, 'member', search).subscribe({
      next: (res: any) => {
        const raw = res.data || [];
        const membersList = raw.map((u: any) => {
          // Find the latest enrollment to keep the enrollment data if available
          const latestEnrollment = (u.enrollments || []).sort((a: any, b: any) => {
            return new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime();
          })[0];

          return {
            userId: (u.id_user || u.id).toString(),
            name: (u.name && u.last_name) ? `${u.name} ${u.last_name}` : (u.name || 'Unknown'),
            email: u.email || '',
            id_gym: latestEnrollment?.id_gym || u.id_gym,
            enrollment_start: latestEnrollment?.start_date || latestEnrollment?.enrollment_date,
            enrollment_end: latestEnrollment?.end_date
          } as GymMember;
        });

        this.members.set(membersList);
      }
    });
  }

  checkPotentialDuplicate() {
    const raw = this.form.getRawValue();
    const memberId = raw.id_user;
    const type = raw.type;
    const sessionId = raw.id_session;
    const courseId = raw.id_course;
    const eventId = raw.id_event;
    const startDate = raw.start_date;
    const currentGymId = this.currentGymId();

    // 1. Independent Checks (e.g. Stock)
    if (type === 'product') {
      const productId = raw.id_product;
      const quantity = raw.quantity || 1;
      const product = this.products().find(p => p.id_product === productId);

      if (product) {
        const stock = product.stock || 0;
        if (quantity > stock) {
          this.isDuplicate.set(true);
          this.duplicateMessage.set(`Insufficient stock. Only ${stock} units available.`);
          return;
        } else {
          this.isDuplicate.set(false);
          this.duplicateMessage.set('');
        }
      }
    }

    // 2. Member-dependent Checks
    if (!memberId || !currentGymId) {
      // Only clear if we aren't already in a product error state
      if (type !== 'product') {
        this.isDuplicate.set(false);
        this.duplicateMessage.set('');
      }
      return;
    }

    if (type === 'membership' && startDate) {
      const member = this.members().find(m => m.userId === memberId);
      // Only alert if the active membership is in the SAME gym
      if (member && member.enrollment_end && member.id_gym?.toString() === currentGymId.toString()) {
        const end = new Date(member.enrollment_end);
        const selectedStart = new Date(startDate);

        if (selectedStart <= end) {
          this.isDuplicate.set(true);
          this.duplicateMessage.set(`Member has an active membership in THIS gym until ${member.enrollment_end}.`);
          return;
        }
      }
    }

    if (type === 'course' && sessionId) {
      this.sessionService.getSessionAttendances(sessionId).subscribe({
        next: (atts: any[]) => {
          const exists = atts.some(a => (a.member?.id_user || a.id_user || a.member_id) === memberId);
          this.isDuplicate.set(exists);
          this.duplicateMessage.set(exists ? 'Member is already enrolled in this session.' : '');
        }
      });
    } else if (type === 'course' && courseId && !sessionId) {
      // Check for course-level enrollment (Abonnement/Weekly)
      this.memberService.getMembers(1, 1, { search: memberId, id_course: courseId }).subscribe({
        next: (res: any) => {
          const exists = res.data && res.data.length > 0;
          this.isDuplicate.set(exists);
          this.duplicateMessage.set(exists ? 'Member is already enrolled in this course (Weekly Sessions).' : '');
        }
      });
    } else if (type === 'event' && eventId) {
      this.eventService.getEventAttendances(eventId).subscribe({
        next: (atts: any[]) => {
          const exists = atts.some(a => (a.member?.id_user || a.id_user || a.member_id) === memberId);
          this.isDuplicate.set(exists);
          this.duplicateMessage.set(exists ? 'Member is already registered for this event.' : '');
        }
      });
    } else if (type !== 'product') {
      this.isDuplicate.set(false);
      this.duplicateMessage.set('');
    }
  }

  loadAllEvents() {
    this.eventService.getEvents(1, 100).subscribe({
      next: (res: any) => {
        const rawEvents = res.data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const availableEvents = rawEvents.filter((e: any) => {
          // 1. Date check (ensure event hasn't ended)
          const eventEndDate = new Date(e.end_date || e.start_date);
          eventEndDate.setHours(23, 59, 59, 999);
          if (eventEndDate < today) return false;

          // 2. Capacity check
          if (e.max_participants > 0 && (e.attendances_count || 0) >= e.max_participants) {
            return false;
          }

          return true;
        });

        this.events.set(availableEvents);
      }
    });
  }

  loadNutritionPlans() {
    this.nutritionService.getNutritionPlans(1, 100).subscribe({
      next: (res: any) => {
        // Handle both paginated response and direct array
        const rawData = res.data || res || [];
        if (Array.isArray(rawData)) {
          this.nutritionPlans.set(rawData);
        } else {
          this.nutritionPlans.set([]);
        }
      },
      error: () => this.nutritionPlans.set([])
    });
  }

  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (res: any) => {
        this.products.set(res.data || []);
      }
    });
  }

  loadPlans() {
    const gymId = this.currentGymId();
    if (!gymId) return;

    this.planService.getPlans(gymId.toString()).subscribe({
      next: (res: any) => {
        this.plans.set(res.data || []);
      }
    });
  }

  loadCourses() {
    this.courseService.getCourses().subscribe({
      next: (res: any) => {
        this.courses.set(res.data || []);
      }
    });
  }

  onCourseSelect(courseId: string) {
    this.sessions.set([]);
    this.form.patchValue({ id_session: '', course_payment_type: 'session' });

    if (courseId) {
      this.sessionService.getCourseSessions(courseId).subscribe({
        next: (sessions) => {
          this.sessions.set(sessions);
        }
      });

      const course = this.courses().find(c => c.id_course === courseId);
      if (course) {
        if ((course.recurrence_weeks || course.is_subscription_enabled) && course.subscription_price) {
          this.form.patchValue({ course_payment_type: 'subscription', amount: course.subscription_price });
        } else if (course.price) {
          this.form.patchValue({ amount: course.price });
        }
      }
    }
  }

  onCoursePaymentTypeChange(type: string) {
    const courseId = this.form.get('id_course')?.value;
    if (!courseId) return;

    const course = this.courses().find(c => c.id_course === courseId);
    if (!course) return;

    if (type === 'subscription' && course.subscription_price) {
      this.form.patchValue({ amount: course.subscription_price, id_session: '' });
    } else if (type === 'session' && course.price) {
      this.form.patchValue({ amount: course.price });
    }
  }

  onEventSelect(eventId: string) {
    const event = this.events().find(e => e.id_event === eventId || e.id === eventId);
    if (event && event.price) {
      this.form.patchValue({ amount: event.price });
    }
  }

  onPlanSelect(planId: string) {
    const plan = this.plans().find(p => p.id === planId || (p as any).id_plan === planId);
    if (plan) {
      this.form.patchValue({
        amount: plan.price
      });
    }
  }

  onNutritionSelect(planId: string) {
    const plan = this.nutritionPlans().find(p => String(p.id_plan || p.id) === String(planId));
    if (plan && plan.price) {
      this.form.patchValue({ amount: plan.price });
    }
  }

  getSelectedProduct() {
    const id = this.form.get('id_product')?.value;
    if (!id) return null;
    return this.products().find(p => String(p.id_product) === String(id));
  }

  getSelectedCourse() {
    const id = this.form.get('id_course')?.value;
    if (!id) return null;
    return this.courses().find(c => String(c.id_course) === String(id));
  }

  onProductSelect(productId: string) {
    const product = this.products().find(p => p.id_product === productId);
    if (product) {
      this.calculateProductTotal();
    }
  }

  calculateProductTotal() {
    const productId = this.form.get('id_product')?.value;
    const quantity = this.form.get('quantity')?.value || 1;
    const product = this.products().find(p => p.id_product === productId);

    if (product) {
      const basePrice = product.price || 0;
      const discount = product.discount_percentage || 0;
      const discountedPrice = basePrice * (1 - (discount / 100));

      this.form.patchValue({
        amount: discountedPrice * quantity
      });
    }
  }

  private buildPaymentsCacheKey(gymId: string, page: number): string {
    return [
      gymId,
      page,
      this.perPage,
      this.startDate() || '',
      this.endDate() || '',
      this.statusFilter() || '',
      this.gatewayFilter() || '',
      this.searchQuery() || ''
    ].join('|');
  }

  private clearPaymentsCache() {
    this.paymentsPageCache.clear();
  }

  private readCachedPage(gymId: string, page: number): any | null {
    const key = this.buildPaymentsCacheKey(gymId, page);
    const entry = this.paymentsPageCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.paymentsCacheTtlMs) {
      this.paymentsPageCache.delete(key);
      return null;
    }

    return entry.response;
  }

  private writeCachedPage(gymId: string, page: number, response: any) {
    const key = this.buildPaymentsCacheKey(gymId, page);
    this.paymentsPageCache.set(key, { response, timestamp: Date.now() });
  }

  private normalizePaymentsResponse(res: any, fallbackPage: number) {
    const parsedCurrent = Number(res?.meta?.current_page);
    const parsedLast = Number(res?.meta?.last_page);
    const parsedTotal = Number(res?.meta?.total);
    const parsedPerPage = Number(res?.meta?.per_page);

    const safeCurrent = Number.isFinite(parsedCurrent) && parsedCurrent > 0
      ? Math.floor(parsedCurrent)
      : fallbackPage;
    const safeLast = Number.isFinite(parsedLast) && parsedLast > 0
      ? Math.floor(parsedLast)
      : 1;
    const safeTotal = Number.isFinite(parsedTotal) && parsedTotal >= 0
      ? Math.floor(parsedTotal)
      : 0;
    const safePerPage = Number.isFinite(parsedPerPage) && parsedPerPage > 0
      ? Math.floor(parsedPerPage)
      : this.perPage;

    return {
      data: Array.isArray(res?.data) ? res.data : [],
      meta: {
        current_page: safeCurrent,
        last_page: safeLast,
        total: safeTotal,
        per_page: safePerPage
      },
      financial_summary: res?.financial_summary || null
    };
  }

  private applyPaymentsState(response: any) {
    this.payments.set(Array.isArray(response?.data) ? response.data : []);
    this.currentPage.set(response?.meta?.current_page || 1);
    this.lastPage.set(response?.meta?.last_page || 1);
    this.totalItems.set(response?.meta?.total || 0);

    if (response?.financial_summary) {
      this.financialSummary.set(response.financial_summary);
    }
  }

  private prefetchPage(gymId: string, page: number) {
    if (page < 1) return;
    if (this.lastPage() > 0 && page > this.lastPage()) return;
    if (this.readCachedPage(gymId, page)) return;

    this.paymentsService.listByGym(
      gymId,
      page,
      this.perPage,
      this.startDate(),
      this.endDate(),
      this.statusFilter(),
      this.gatewayFilter(),
      this.searchQuery(),
      false
    ).subscribe({
      next: (res: any) => {
        const normalized = this.normalizePaymentsResponse(res, page);
        if (normalized.meta.current_page > normalized.meta.last_page) return;
        this.writeCachedPage(gymId, page, normalized);
      }
    });
  }

  refresh(forceFirstPage = false) {
    const gymId = this.currentGymId();
    if (!gymId) {
      this.error.set('No gym context found. Please select a gym.');
      return;
    }

    const gymIdStr = gymId.toString();
    if (forceFirstPage) {
      this.currentPage.set(1);
      this.clearPaymentsCache();
    }

    const requestedPage = this.currentPage();
    const shouldRequestSummary = forceFirstPage || !this.financialSummary();
    const cached = this.readCachedPage(gymIdStr, requestedPage);
    if (cached) {
      this.error.set(null);
      this.isLoading.set(false);
      this.applyPaymentsState(cached);
      this.prefetchPage(gymIdStr, requestedPage + 1);
      return;
    }

    const requestId = ++this.paymentsRequestId;

    this.isLoading.set(true);
    this.error.set(null);

    // Load Payments (Main focus for search/filtering)
    this.paymentsService.listByGym(
      gymIdStr,
      requestedPage,
      this.perPage,
      this.startDate(),
      this.endDate(),
      this.statusFilter(),
      this.gatewayFilter(),
      this.searchQuery(),
      shouldRequestSummary
    ).pipe(finalize(() => {
      if (requestId === this.paymentsRequestId) {
        this.isLoading.set(false);
      }
    }))
      .subscribe({
        next: (res: any) => {
          if (requestId !== this.paymentsRequestId) return;

          const normalized = this.normalizePaymentsResponse(res, requestedPage);
          if (normalized.meta.current_page > normalized.meta.last_page) {
            this.currentPage.set(normalized.meta.last_page);
            this.refresh();
            return;
          }

          this.writeCachedPage(gymIdStr, normalized.meta.current_page, normalized);
          this.applyPaymentsState(normalized);
          this.prefetchPage(gymIdStr, normalized.meta.current_page + 1);
        },
        error: () => {
          if (requestId !== this.paymentsRequestId) return;
          this.error.set('Could not synchronize ledger data. Check connection.');
        }
      });
  }

  onSearch(query: string) {
    this.searchSubject.next(query);
  }

  onMemberSearch(query: string) {
    this.memberSearchTerm.set(query);
    this.memberSearchSubject.next(query);
  }

  onFilterChange() {
    this.refresh(true);
  }

  clearFilters() {
    this.startDate.set('');
    this.endDate.set('');
    this.statusFilter.set('');
    this.gatewayFilter.set('');
    this.searchQuery.set('');
    this.searchSubject.next(''); // Clear the debounced subject too
    this.refresh(true);
  }

  changePage(page: number) {
    if (page < 1 || page > this.lastPage()) return;
    this.currentPage.set(page);
    this.refresh();
  }

  viewReceipt(p: PaymentDto) {
    this.selectedPayment.set(p);
    this.showNewPaymentForm.set(false);
  }

  printReceipt(p: PaymentDto) {
    this.selectedPayment.set(p);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptContent = `
      <html>
      <head>
        <title>Receipt - ${p.public_id}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; max-width: 300px; margin: 0 auto; line-height: 1.4; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 1.4em; letter-spacing: 2px; }
          .header p { margin: 5px 0; font-size: 0.85em; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 0.9em; }
          .total { font-weight: bold; font-size: 1.2em; margin-top: 15px; padding-top: 10px; border-top: 1px solid #000; }
          .footer { text-align: center; margin-top: 30px; font-size: 0.8em; font-style: italic; }
          @media print {
            body { margin: 0; padding: 10px; }
            @page { size: auto; margin: 0mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${p.gym_name.toUpperCase()}</h2>
          <p>*** OFFICIAL RECEIPT ***</p>
          <div class="divider"></div>
          <p>Receipt #: ${p.public_id}</p>
          <p>Date: ${p.date}</p>
        </div>
        
        <div class="row">
          <span>CUSTOMER:</span>
          <span>${p.member.name.toUpperCase()}</span>
        </div>
        ${p.member.email ? `<div class="row"><span>EMAIL:</span><span>${p.member.email}</span></div>` : ''}
        
        <div class="divider"></div>
        
        <div class="row" style="font-weight: bold">
          <span>DESCRIPTION</span>
          <span>TOTAL</span>
        </div>
        
        <div class="row">
          <span>${p.category.label}</span>
          <span>${p.amount.formatted}</span>
        </div>
        
        ${p.product ? `
        <div class="row" style="margin-top: -5px">
          <span style="font-size: 0.8em"> >> PRODUCT: ${p.product.name}</span>
        </div>
        ` : ''}

        <div class="divider"></div>

        <div class="row">
          <span>PAYMENT METHOD:</span>
          <span>${p.gateway.label.toUpperCase()}</span>
        </div>

        <div class="row">
          <span>STATUS:</span>
          <span>${p.status.label.toUpperCase()}</span>
        </div>

        ${p.external_reference ? `
        <div class="row">
          <span>EXT REF:</span>
          <span style="font-size: 0.8em">${p.external_reference}</span>
        </div>
        ` : ''}
        
        <div class="divider" style="border-top-style: solid"></div>
        
        <div class="row total">
          <span>TOTAL PAID</span>
          <span>${p.amount.formatted}</span>
        </div>
        
        <div class="divider" style="border-top-style: solid"></div>
        
        <div class="footer">
          <p>Thank you for choosing ${p.gym_name}!</p>
          <p>Terms: No refund on memberships.</p>
          <p>-------------------------</p>
          <p>PROCESSED BY GYM-OS v2.1</p>
        </div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptContent);
    printWindow.document.close();
  }

  openNewPayment() {
    this.selectedPayment.set(null);
    this.showNewPaymentForm.set(true);
    this.form.reset({
      id_user: '',
      amount: 0,
      quantity: 1,
      method: '',
      type: 'membership',
      id_product: '',
      id_plan: '',
      id_course: '',
      id_session: '',
      id_event: '',
      id_transaction: '',
      start_date: new Date().toISOString().split('T')[0]
    });
  }

  save() {
    this.error.set(null);
    if (this.form.invalid || this.isDuplicate()) {
      if (this.isDuplicate()) {
        this.error.set(this.duplicateMessage());
      }
      this.form.markAllAsTouched();
      return;
    }

    const gymId = this.currentGymId();
    if (!gymId) {
      this.error.set('Cannot process payment: Gym ID is missing.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      member_id: raw.id_user!,
      id_gym: gymId.toString(),
      amount: raw.amount!,
      currency: 'TND',
      gateway: raw.method!,
      category: raw.type ?? 'membership',
      id_product: raw.id_product || null,
      id_plan: raw.id_plan || null,
      id_course: raw.id_course || null,
      id_session: raw.id_session || null,
      id_event: raw.id_event || null,
      id_nutrition: raw.id_nutrition || null,
      start_date: raw.start_date || null,
      external_reference: raw.id_transaction || null
    };

    this.isLoading.set(true);

    this.paymentsService.create(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.showNewPaymentForm.set(false);
          this.clearPaymentsCache();
          this.refresh();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Operation failed. Check permissions/validation.';
          this.error.set(msg);
        }
      });
  }

  finalizePayment(p: PaymentDto) {
    if (p.status.value !== 'pending') return;

    this.isLoading.set(true);
    this.paymentsService.finalize(p.id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.clearPaymentsCache();
          this.refresh();
          if (this.selectedPayment()?.id === p.id) {
            this.selectedPayment.set({ ...p, status: { ...p.status, value: 'finalized', label: 'Finalized', is_locked: true } });
          }
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to finalize transaction.');
        }
      });
  }
}


