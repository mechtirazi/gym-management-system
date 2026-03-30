import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { finalize } from 'rxjs';
import { Product } from '../../../../../shared/models/product.model';

@Component({
  selector: 'app-edit-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-product-modal.component.html',
  styleUrl: './edit-product-modal.component.scss'
})
export class EditProductModalComponent implements OnInit {
  private productService = inject(ProductService);

  productData = input.required<Product>();
  close = output<void>();
  productUpdated = output<void>();

  product = {
    name: '',
    category: '',
    price: null as number | null,
    stock: null as number | null
  };

  isSubmitting = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit() {
    const data = this.productData();
    if (data) {
      this.product = {
        name: data.name,
        category: data.category,
        price: data.price,
        stock: data.stock
      };
    }
  }

  onSubmit(event: Event) {
    event.preventDefault();
    if (!this.product.name || !this.product.category || this.product.price === null || this.product.stock === null) {
      this.error.set('Please fill in all required fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    this.productService.updateProduct(this.productData().id_product, this.product)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.productUpdated.emit();
          this.close.emit();
        },
        error: (err) => {
          console.error('Failed to update product', err);
          this.error.set(err.error?.message || 'Failed to update product. Please try again.');
        }
      });
  }
}
