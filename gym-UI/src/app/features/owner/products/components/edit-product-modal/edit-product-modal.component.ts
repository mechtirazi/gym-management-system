import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { finalize } from 'rxjs';
import { Product } from '../../../../../shared/models/product.model';
import { ToastService } from '../../../../../core/services/toast.service';

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
  private toast = inject(ToastService);

  categories = ['Supplements', 'Equipment', 'Apparel', 'Accessories', 'Nutrition'];

  product = {
    name: '',
    description: '',
    category: '',
    price: null as number | null,
    stock: null as number | null,
    discount_percentage: 0
  };

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isSubmitting = signal<boolean>(false);
  error = signal<string | null>(null);

  get isFormInvalid(): boolean {
    return (
      !this.product.name?.trim() ||
      !this.product.category ||
      this.product.price === null ||
      this.product.stock === null ||
      this.product.price < 0 ||
      this.product.price > 99999 ||
      this.product.stock < 0 ||
      this.product.stock > 99999 ||
      (!this.selectedFile && !this.imagePreview)
    );
  }

  ngOnInit() {
    const data = this.productData();
    if (data) {
      this.product = {
        name: data.name,
        description: data.description || '',
        category: data.category,
        price: data.price,
        stock: data.stock,
        discount_percentage: data.discount_percentage || 0
      };
      // For existing products, image is already in model
      this.imagePreview = data.imageUrl || data.image || null;
    }
  }

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
    if (!this.product.name || !this.product.category || this.product.price === null || this.product.stock === null || (!this.selectedFile && !this.imagePreview)) {
      this.error.set('Please fill in all required fields and ensure a product visual is set.');
      return;
    }
    if (this.product.price < 0 || this.product.price > 99999) {
      this.error.set('Price must be between 0 and 99,999.');
      return;
    }
    if (this.product.stock < 0 || this.product.stock > 99999) {
      this.error.set('Stock must be between 0 and 99,999.');
      return;
    }
    const discount = this.product.discount_percentage ?? 0;
    if (discount < 0 || discount > 100) {
      this.error.set('Discount must be between 0 and 100.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('name', this.product.name);
    formData.append('description', this.product.description);
    formData.append('category', this.product.category);
    formData.append('price', this.product.price.toString());
    formData.append('stock', this.product.stock.toString());
    formData.append('discount_percentage', discount.toString());
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.productService.updateProduct(this.productData().id_product, formData)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Product parameters updated successfully.');
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
