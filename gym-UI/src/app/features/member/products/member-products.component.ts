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
  selector: 'app-member-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PaymentModalComponent],
  templateUrl: './member-products.component.html',
  styleUrl: './member-products.component.scss'
})
export class MemberProductsComponent implements OnInit {
  private memberService = inject(MemberService);
  private cdr = inject(ChangeDetectorRef);

  products: any[] = [];
  gyms: any[] = [];
  loading = true;
  errorMessage = '';

  // Filter & Pagination State
  searchText = '';
  selectedGymId = 'all';
  selectedCategory = 'all';
  currentPage = 1;
  itemsPerPage = 8;

  categories = ['Supplements', 'Equipment', 'Apparel', 'Accessories', 'Nutrition'];

  // Payment UI State
  showPaymentModal = false;
  selectedProduct: any = null;
  processingPayment = false;
  paymentError: string | null = null;
  stripePublicKey = 'pk_test_51TLQe13jzboyv5RLdXqAvrZMNz8jWzDUyVuOfMKOapHK2sDPxyJutifqVFAjAM9dkeqRX91wUm72gLHWKhzjHuoU00aDCrWNnI';

  get filteredProducts() {
    return this.products.filter(product => {
      const matchesSearch = !this.searchText ||
        product.name?.toLowerCase().includes(this.searchText.toLowerCase()) ||
        product.category?.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesGym = this.selectedGymId === 'all' ||
        product.id_gym === this.selectedGymId;

      const matchesCategory = this.selectedCategory === 'all' ||
        product.category === this.selectedCategory;

      return matchesSearch && matchesGym && matchesCategory;
    });
  }

  get paginatedProducts() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage) || 1;
  }

  changePage(page: number) {
    this.currentPage = page;
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      allProducts: this.memberService.getProducts().pipe(catchError(() => of({ data: [] }))),
      mySubscriptions: this.memberService.getMySubscriptions().pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (res: any) => {
        const productsRaw = res.allProducts?.data || res.allProducts || [];
        const subscriptionsRaw = res.mySubscriptions?.data || [];

        // Extract unique gyms from subscriptions
        this.gyms = [];
        const gymIds = new Set();
        subscriptionsRaw.forEach((sub: any) => {
          if (sub.gym && !gymIds.has(sub.gym.id_gym)) {
            gymIds.add(sub.gym.id_gym);
            this.gyms.push(sub.gym);
          }
        });

        this.products = productsRaw.map((product: any) => {
          // Resolve correct image URL
          let imageUrl = product.image;
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
            const cleanPath = imageUrl.replace(/^\//, '');
            imageUrl = `${baseUrl}/${cleanPath}`;
          }

          return {
            ...product,
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1583454110551-21f2fa202114?auto=format&fit=crop&q=80&w=800',
            gymName: product.gym?.name || 'Local Hub',
            quantity: 1 // Default purchase quantity
          };
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Marketplace Hub Sync Error', err);
        this.errorMessage = 'Could not sync product inventory.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  increaseQuantity(product: any) {
    if (product.quantity < product.stock) {
      product.quantity++;
      this.cdr.detectChanges();
    }
  }

  decreaseQuantity(product: any) {
    if (product.quantity > 1) {
      product.quantity--;
      this.cdr.detectChanges();
    }
  }

  calculateTotalPrice(product: any): number {
    if (!product) return 0;
    const price = product.discount_percentage > 0 ? product.discounted_price : product.price;
    return (price || 0) * (product.quantity || 1);
  }

  onBuy(product: any): void {
    if (product.stock <= 0) return;
    this.selectedProduct = product;
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedProduct = null;
    this.cdr.detectChanges();
  }

  completePurchase(event: any) {
    if (!this.selectedProduct) return;

    this.processingPayment = true;
    this.paymentError = null;
    this.cdr.detectChanges();

    const productId = this.selectedProduct.id_product || this.selectedProduct.id;
    const quantity = this.selectedProduct.quantity || 1;

    if (event.method === 'zen_wallet') {
      this.memberService.purchaseProduct(productId, 'zen_wallet', quantity).subscribe({
        next: () => {
          this.handleSuccess('Success! ' + quantity + 'x item(s) acquired.');
        },
        error: (err: any) => this.handleError(err)
      });
    } else {
      // Calculate unit price after discount if any
      let unitPrice = this.selectedProduct.price ? parseFloat(this.selectedProduct.price) : 0;
      if (this.selectedProduct.discount_percentage > 0) {
          unitPrice = unitPrice * (1 - (this.selectedProduct.discount_percentage / 100));
      }
      
      const totalAmount = unitPrice * quantity;

      this.memberService.createPaymentIntent(this.selectedProduct.id_gym, totalAmount).subscribe({
        next: (res: any) => {
          event.stripe.confirmCardPayment(res.client_secret, {
            payment_method: { card: event.card }
          }).then((result: any) => {
            if (result.error) {
              this.handleError({ error: { message: result.error.message } });
            } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
              this.memberService.purchaseProduct(productId, 'credit_card', quantity).subscribe({
                next: () => {
                  this.handleSuccess('Payment Confirmed! Your order for ' + quantity + 'x item(s) is being fulfilled.');
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
    this.cdr.detectChanges();
    
    // 1. Give users time to see "Transaction Confirmed" in the modal
    setTimeout(() => {
      this.closePaymentModal();
      this.silentRefresh(); // Refresh without showing the global skeleton loader
      
      // 2. Wait for the modal fade-out transition (0.5s) to complete before alerting
      setTimeout(() => alert(msg), 600);
    }, 1800);
  }

  // Refresh data without triggering the 'loading' skeletons
  private silentRefresh(): void {
    this.memberService.getProducts().subscribe({
      next: (res: any) => {
        const productsRaw = res.data || res || [];
        this.products = productsRaw.map((product: any) => ({
          ...product,
          imageUrl: this.resolveImageUrl(product.image),
          gymName: product.gym?.name || 'Local Hub',
          quantity: 1
        }));
        this.cdr.detectChanges();
      }
    });
  }

  private resolveImageUrl(imageUrl: string): string {
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
      const cleanPath = imageUrl.replace(/^\//, '');
      return `${baseUrl}/${cleanPath}`;
    }
    return imageUrl || 'https://images.unsplash.com/photo-1583454110551-21f2fa202114?auto=format&fit=crop&q=80&w=800';
  }

  private handleError(err: any) {
    console.error('TRANSACTION FAILURE:', err);
    this.paymentError = err.error?.message || 'Biometric synchronization failed.';
    this.processingPayment = false;
    this.cdr.detectChanges();
  }
}
