import { Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ReceptionistPaymentsService, PaymentDto } from './receptionist-payments.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MemberService } from '../../../owner/member/services/member.service';
import { GymMember } from '../../../../shared/models/gym-member.model';

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

  isLoading = signal(false);
  error = signal<string | null>(null);

  payments = signal<PaymentDto[]>([]);
  members = signal<GymMember[]>([]);
  selectedPayment = signal<PaymentDto | null>(null);

  // Pagination State
  currentPage = signal(1);
  lastPage = signal(1);
  totalItems = signal(0);
  perPage = 8;

  // Filter State
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Metrics State
  todaysTotal = signal(0);
  totalRevenue = signal(0);

  // Current Gym Context
  currentGymId = computed(() => this.authService.connectedGymId());

  form = this.fb.group({
    id_user: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    method: ['', Validators.required],
    type: ['membership'],
    id_transaction: ['']
  });

  canEdit = computed(() => !!this.selectedPayment());

  constructor() {
    effect(() => {
      if (this.currentGymId()) {
        this.refresh();
        this.loadMembers();
      }
    });
  }

  ngOnInit() {
    this.refresh();
    this.loadMembers();
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
        this.endDate()
      ),
      stats: this.paymentsService.getStats()
    })
    .pipe(finalize(() => this.isLoading.set(false)))
    .subscribe({
      next: (res) => {
        // Handle Payments
        this.payments.set(res.payments.data);
        this.currentPage.set(res.payments.meta.current_page);
        this.lastPage.set(res.payments.meta.last_page);
        this.totalItems.set(res.payments.meta.total);
        this.todaysTotal.set(res.payments.meta.todays_total);

        // Handle Stats
        if (res.stats.success) {
          this.totalRevenue.set(res.stats.data.kpis.revenueTotal);
        }
      },
      error: () => this.error.set('Could not synchronize ledger data. Check connection.')
    });
  }

  onFilterChange() {
    this.refresh(true);
  }

  clearFilters() {
    this.startDate.set('');
    this.endDate.set('');
    this.onFilterChange();
  }

  exportToCsv() {
    if (this.payments().length === 0) return;

    const headers = ['Date', 'Member ID', 'Amount', 'Method', 'Type', 'Transaction ID'];
    const rows = this.payments().map(p => [
      p.created_at || '',
      p.id_user,
      p.amount,
      p.method,
      p.type || 'standard',
      p.id_transaction
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  changePage(page: number) {
    if (page < 1 || page > this.lastPage()) return;
    this.currentPage.set(page);
    this.refresh();
  }

  select(p: PaymentDto) {
    this.selectedPayment.set(p);
    this.form.patchValue({
      id_user: p.id_user,
      amount: p.amount,
      method: p.method,
      type: p.type ?? 'membership',
      id_transaction: p.id_transaction
    });
  }

  reset() {
    this.selectedPayment.set(null);
    this.form.reset({
      id_user: '',
      amount: 0,
      method: '',
      type: 'membership',
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
      id_user: raw.id_user!,
      id_gym: gymId.toString(),
      amount: raw.amount!,
      method: raw.method!,
      type: raw.type ?? 'membership',
      id_transaction: raw.id_transaction || crypto.randomUUID()
    };

    this.isLoading.set(true);

    const selected = this.selectedPayment();
    const req$ = selected
      ? this.paymentsService.update(selected.id_payment, payload)
      : this.paymentsService.create(payload);

    req$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => {
        this.reset();
        this.refresh();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Operation failed. Check permissions/validation.';
        this.error.set(msg);
      }
    });
  }
}

