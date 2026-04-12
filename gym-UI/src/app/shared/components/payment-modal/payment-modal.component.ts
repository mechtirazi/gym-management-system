import { Component, EventEmitter, Input, Output, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.scss']
})
export class PaymentModalComponent {
  @Input() showModal: boolean = false;
  @Input() itemTitle: string = 'Digital Item';
  @Input() itemSubtitle: string = 'Subscription Tier';
  @Input() itemImage: string = 'https://ui-avatars.com/api/?name=Hub&background=1e293b&color=10b981&bold=true';
  @Input() purchaseTerms: string = 'Unlocking this digital item will permanently bind it to your active profile.';
  @Input() headerTitle: string = 'Secure Checkout Vault';
  @Input() processingPayment: boolean = false;
  
  @Output() cancelPayment = new EventEmitter<void>();
  @Output() confirmPayment = new EventEmitter<void>();

  private cdr = inject(ChangeDetectorRef);
  paymentStepper = 1;

  closeModal() {
    if (this.processingPayment) return;
    this.paymentStepper = 1;
    this.cancelPayment.emit();
  }

  nextStep() {
    if (this.paymentStepper === 1) {
      this.paymentStepper = 2;
    } else if (this.paymentStepper === 2) {
      this.paymentStepper = 3;
      this.confirmPayment.emit();
    }
    this.cdr.detectChanges();
  }
}
