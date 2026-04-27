import { Component, EventEmitter, Input, Output, ChangeDetectorRef, inject, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var Stripe: any;

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.scss']
})
export class PaymentModalComponent implements AfterViewInit, OnChanges {
  @Input() showModal: boolean = false;
  @Input() itemTitle: string = 'Digital Item';
  @Input() itemSubtitle: string = 'Subscription Tier';
  @Input() itemImage: string = 'https://ui-avatars.com/api/?name=Hub&background=1e293b&color=10b981&bold=true';
  @Input() purchaseTerms: string = 'Unlocking this digital item will permanently bind it to your active profile.';
  @Input() headerTitle: string = 'Secure Checkout Vault';
  @Input() processingPayment: boolean = false;
  @Input() stripePublicKey: string = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI';
  @Input() totalPrice: number | null = null;

  @Output() cancelPayment = new EventEmitter<void>();
  @Output() confirmPayment = new EventEmitter<any>();

  @Input() plans: any[] = [];
  selectedPlan: any = null;

  private cdr = inject(ChangeDetectorRef);
  paymentStepper = 1;
  selectedMethod = 'zen_wallet';

  private stripe: any;
  private elements: any;
  private cardNumber: any;
  private cardExpiry: any;
  private cardCvc: any;
  private cardValidState = { number: false, expiry: false, cvc: false };

  isCardValid = false;
  cardError = '';
  cardBrand = 'unknown';
  @Input() paymentError: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showModal']?.currentValue === true) {
      this.paymentStepper = 1;
      this.selectedMethod = 'zen_wallet';
      this.isCardValid = false;
      this.cardError = '';
      
      if (this.plans && this.plans.length > 0) {
        this.selectedPlan = this.plans[0];
      } else {
        this.selectedPlan = null;
      }

      // Pre-initialize Stripe early
      setTimeout(() => this.initStripe(), 100);
    }

    if (changes['plans'] && this.plans && this.plans.length > 0) {
      this.selectedPlan = this.plans[0];
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit() {
    if (this.showModal) {
      this.initStripe();
    }
  }

  private initStripe() {
    console.log('STRIPE_DEBUG: initStripe called. Key:', this.stripePublicKey);

    if (!(window as any).Stripe) {
      console.error('STRIPE_DEBUG: Stripe.js not loaded on window');
      return;
    }

    if (!this.stripePublicKey) {
      console.warn('STRIPE_DEBUG: No Public Key detected');
      this.cardError = 'Configuration Error: Stripe Public Key is missing.';
      return;
    }

    if (!this.stripe) {
      try {
        console.log('STRIPE_DEBUG: Creating Stripe instance...');
        this.stripe = (window as any).Stripe(this.stripePublicKey);
        this.elements = this.stripe.elements();

        const style = {
          base: {
            color: '#ffffff',
            fontFamily: '"Courier New", Courier, monospace',
            fontSmoothing: 'antialiased',
            fontSize: '18px',
            letterSpacing: '2px',
            '::placeholder': { color: 'rgba(255, 255, 255, 0.4)' }
          },
          invalid: {
            color: '#ef4444',
            iconColor: '#ef4444',
            '::placeholder': { color: '#f87171' }
          }
        };

        this.cardNumber = this.elements.create('cardNumber', { style });
        this.cardExpiry = this.elements.create('cardExpiry', { style });
        this.cardCvc = this.elements.create('cardCvc', { style });

        const checkValidity = () => {
          this.isCardValid = this.cardValidState.number && this.cardValidState.expiry && this.cardValidState.cvc;
          this.cdr.detectChanges();
        };

        this.cardNumber.on('change', (event: any) => {
          this.cardValidState.number = event.complete;
          if (event.brand) {
            this.cardBrand = event.brand;
          } else {
            this.cardBrand = 'unknown';
          }
          if(event.error) this.cardError = event.error.message;
          else this.cardError = '';
          checkValidity();
        });

        this.cardExpiry.on('change', (event: any) => {
          this.cardValidState.expiry = event.complete;
          if(event.error) this.cardError = event.error.message;
          checkValidity();
        });

        this.cardCvc.on('change', (event: any) => {
          this.cardValidState.cvc = event.complete;
          if(event.error) this.cardError = event.error.message;
          checkValidity();
        });

      } catch (error) {
        console.error('STRIPE: Initialization Error', error);
        this.cardError = 'Stripe instance failure.';
      }
    }

    // Mount attempt
    setTimeout(() => {
      const numberElement = document.getElementById('card-number');
      if (numberElement && this.cardNumber) {
        try {
          if (numberElement.children.length === 0) {
            this.cardNumber.mount('#card-number');
            this.cardExpiry.mount('#card-expiry');
            this.cardCvc.mount('#card-cvc');
          } else {
            this.cardNumber.unmount();
            this.cardExpiry.unmount();
            this.cardCvc.unmount();
            
            this.cardNumber.mount('#card-number');
            this.cardExpiry.mount('#card-expiry');
            this.cardCvc.mount('#card-cvc');
          }
        } catch (e) {
          console.warn('STRIPE: Remount warning', e);
        }
      }
    }, 200);
  }

  selectPlan(plan: any) {
    this.selectedPlan = plan;
    this.cdr.detectChanges();
  }

  selectMethod(method: string) {
    this.selectedMethod = method;
    if (method === 'credit_card') {
      this.initStripe();
    }
    this.cdr.detectChanges();
  }

  closeModal() {
    if (this.processingPayment) return;
    this.paymentStepper = 1;
    this.cancelPayment.emit();
  }

  async nextStep() {
    if (this.paymentStepper === 1) {
      this.paymentStepper = 2;
      if (this.selectedMethod === 'credit_card') {
        this.initStripe();
      }
    } else if (this.paymentStepper === 2) {
      // Move to Step 3 (Processing)
      this.paymentStepper = 3;
      
      if (this.selectedMethod === 'zen_wallet') {
        this.confirmPayment.emit({ 
          method: 'zen_wallet',
          plan: this.selectedPlan
        });
      } else {
        this.confirmPayment.emit({
          method: 'stripe',
          stripe: this.stripe,
          card: this.cardNumber,
          plan: this.selectedPlan
        });
      }
    }
  }

  retry() {
    this.paymentStepper = 2;
    this.paymentError = null;
    this.cdr.detectChanges();
  }
}
