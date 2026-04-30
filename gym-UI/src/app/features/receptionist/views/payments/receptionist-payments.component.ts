import { Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ReceptionistPaymentsService, PaymentDto } from './receptionist-payments.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MemberService } from '../../../owner/member/services/member.service';
import { GymMember } from '../../../../shared/models/gym-member.model';
import { ProductService } from '../../../owner/products/services/product.service';

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

  isLoading = signal(false);
  error = signal<string | null>(null);

  payments = signal<PaymentDto[]>([]);
  members = signal<GymMember[]>([]);
  products = signal<any[]>([]);
  selectedPayment = signal<PaymentDto | null>(null);

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
    method: ['', Validators.required],
    type: ['membership'],
    id_product: [''],
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
      }
    });
  }

  ngOnInit() {
    this.refresh();
    this.loadMembers();
    this.loadProducts();
  }

  loadMembers() {
    this.memberService.getMembers(1, 1000).subscribe({
      next: (res: any) => {
        const raw = res.data || [];
        const mapped = raw.map((item: any) => {
          const u = item.member;
          return {
            userId: u?.id_user || u?.id,
            name: (u?.name && u?.last_name) ? `${u.name} ${u.last_name}` : (u?.name || 'Unknown'),
            email: u?.email || ''
          } as GymMember;
        });
        this.members.set(mapped);
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
      method: '',
      type: 'membership',
      id_product: '',
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
}


