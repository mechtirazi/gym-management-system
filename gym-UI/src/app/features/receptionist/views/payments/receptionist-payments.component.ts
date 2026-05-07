import { Component, computed, inject, signal, OnInit, effect } from '@angular/core';
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

@Component({
  selector: 'app-receptionist-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './receptionist-payments.component.html',
  styleUrl: './receptionist-payments.component.scss'
})
export class ReceptionistPaymentsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private paymentsService = inject(ReceptionistPaymentsService);
  private authService = inject(AuthService);
  private memberService = inject(MemberService);
  private productService = inject(ProductService);
  private planService = inject(MembershipPlanService);
  private courseService = inject(CourseService);
  private sessionService = inject(SessionService);
  private eventService = inject(EventService);

  isLoading = signal(false);
  error = signal<string | null>(null);

  payments = signal<PaymentDto[]>([]);
  members = signal<GymMember[]>([]);
  plans = signal<MembershipPlan[]>([]);
  products = signal<any[]>([]);
  courses = signal<any[]>([]);
  sessions = signal<any[]>([]);
  events = signal<any[]>([]);
  selectedPayment = signal<PaymentDto | null>(null);

  // Member Search State
  memberSearchTerm = signal('');
  filteredMembers = computed(() => {
    const term = this.memberSearchTerm().toLowerCase().trim();
    if (!term) return this.members();
    return this.members().filter(m => 
      m.name?.toLowerCase().includes(term) || 
      m.email?.toLowerCase().includes(term)
    );
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
    id_session: [''],
    id_event: [''],
    id_transaction: ['']
  });

  constructor() {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(val => {
      this.searchQuery.set(val);
      this.refresh(true);
    });

    effect(() => {
      if (this.currentGymId()) {
        this.refresh();
        this.loadMembers();
        this.loadProducts();
        this.loadPlans();
        this.loadCourses();
      }
    });

    this.form.get('type')?.valueChanges.subscribe(type => {
      if (type === 'event') {
        this.loadAllEvents();
      } else if (type === 'course') {
        this.sessions.set([]); // Clear sessions until a course is picked
      }
    });
  }

  loadAllEvents() {
    this.eventService.getEvents(1, 100).subscribe({
      next: (res: any) => {
        this.events.set(res.data || []);
      }
    });
  }

  ngOnInit() {
    this.refresh();
    this.loadMembers();
    this.loadProducts();
    this.loadPlans();
    this.loadCourses();
  }

  loadMembers() {
    this.memberService.getMembers(1, 1000).subscribe({
      next: (res: any) => {
        const raw = res.data || [];
        const uniqueMembers = new Map<string, GymMember>();

        raw.forEach((item: any) => {
          const u = item.member;
          if (!u) return;

          const email = (u.email || '').toLowerCase().trim();
          const fullName = `${u.name || ''} ${u.last_name || ''}`.toLowerCase().trim();
          const compositeKey = `${fullName}-${email}`;

          if (email && !uniqueMembers.has(compositeKey)) {
            uniqueMembers.set(compositeKey, {
              userId: u.id_user || u.id,
              name: (u.name && u.last_name) ? `${u.name} ${u.last_name}` : (u.name || 'Unknown'),
              email: u.email || ''
            } as GymMember);
          }
        });

        this.members.set(Array.from(uniqueMembers.values()));
      }
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
    this.form.patchValue({ id_session: '' });
    
    if (courseId) {
      this.sessionService.getCourseSessions(courseId).subscribe({
        next: (sessions) => {
          this.sessions.set(sessions);
        }
      });
      
      const course = this.courses().find(c => c.id_course === courseId);
      if (course && course.price) {
        this.form.patchValue({ amount: course.price });
      }
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
      this.form.patchValue({
        amount: product.price * quantity
      });
    }
  }

  refresh(forceFirstPage = false) {
    const gymId = this.currentGymId();
    if (!gymId) {
      this.error.set('No gym context found. Please select a gym.');
      return;
    }

    if (forceFirstPage) {
      this.currentPage.set(1);
    }

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      payments: this.paymentsService.listByGym(
        gymId.toString(),
        this.currentPage(),
        this.perPage,
        this.startDate(),
        this.endDate(),
        this.statusFilter(),
        this.gatewayFilter(),
        this.searchQuery()
      ),
      stats: this.paymentsService.getStats()
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res: any) => {
          // Handle Payments
          this.payments.set(res.payments.data);
          this.currentPage.set(res.payments.meta.current_page);
          this.lastPage.set(res.payments.meta.last_page);
          this.totalItems.set(res.payments.meta.total);

          // Handle Financial Summary
          if (res.payments.financial_summary) {
            this.financialSummary.set(res.payments.financial_summary);
          }

          // Handle Stats
          if (res.stats.success) {
            this.totalRevenue.set(res.stats.data.kpis.revenueTotal);
          }
        },
        error: () => this.error.set('Could not synchronize ledger data. Check connection.')
      });
  }

  onSearch(query: string) {
    this.searchSubject.next(query);
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
      id_transaction: ''
    });
  }

  save() {
    this.error.set(null);
    if (this.form.invalid) {
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
      id_session: raw.id_session || null,
      id_event: raw.id_event || null,
      external_reference: raw.id_transaction || null
    };

    this.isLoading.set(true);

    this.paymentsService.create(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.showNewPaymentForm.set(false);
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


