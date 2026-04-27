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

  categories = ['Supplements', 'Equipment', 'Apparel', 'Accessories', 'Nutrition'];
  
  product = {
    name: '',
    category: 'Supplements',
    price: null as number | null,
    stock: null as number | null,
    discount_percentage: 0
  };

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isSubmitting = signal<boolean>(false);
  error = signal<string | null>(null);

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result as string;
      reader.readAsDataURL(file);
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

    const formData = new FormData();
    formData.append('name', this.product.name);
    formData.append('category', this.product.category);
    formData.append('price', this.product.price.toString());
    formData.append('stock', this.product.stock.toString());
    formData.append('discount_percentage', this.product.discount_percentage.toString());
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.productService.createProduct(formData)
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
