import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ReceptionistPaymentsService, PaymentDto } from './receptionist-payments.service';

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

  isLoading = signal(false);
  error = signal<string | null>(null);

  payments = signal<PaymentDto[]>([]);
  selectedPayment = signal<PaymentDto | null>(null);

  form = this.fb.group({
    id_user: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    method: ['', Validators.required],
    type: ['membership'],
    id_transaction: ['']
  });

  canEdit = computed(() => !!this.selectedPayment());

  constructor() {
    this.refresh();
  }

  refresh() {
    this.isLoading.set(true);
    this.error.set(null);
    this.paymentsService
      .list()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: list => this.payments.set(list),
        error: () => this.error.set('Could not load payments.')
      });
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

    const raw = this.form.getRawValue();
    const payload: { id_user: string; amount: number; method: string; type?: string | null; id_transaction: string } = {
      id_user: raw.id_user!,
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

