import { Component, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-product-modal.component.html',
  styleUrl: './add-product-modal.component.scss'
})
export class AddProductModalComponent {
  private productService = inject(ProductService);

  close = output<void>();
  productAdded = output<void>();

  product = {
    name: '',
    category: '',
    price: null as number | null,
    stock: null as number | null
  };

  isSubmitting = signal<boolean>(false);
  error = signal<string | null>(null);

  onSubmit(event: Event) {
    event.preventDefault();
    if (!this.product.name || !this.product.category || this.product.price === null || this.product.stock === null) {
      this.error.set('Please fill in all required fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    this.productService.createProduct(this.product)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.productAdded.emit();
          this.close.emit();
        },
        error: (err) => {
          console.error('Failed to create product', err);
          this.error.set(err.error?.message || 'Failed to create product. Please try again.');
        }
      });
  }
}
