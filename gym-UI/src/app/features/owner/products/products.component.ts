import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from './services/product.service';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { FilterControlsComponent } from '../components/filter-controls/filter-controls.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { AddProductModalComponent } from './components/add-product-modal/add-product-modal.component';
import { EditProductModalComponent } from './components/edit-product-modal/edit-product-modal.component';
import { ProductOrdersModalComponent } from './components/product-orders-modal/product-orders-modal.component';
import { AddOrderModalComponent } from './components/add-order-modal/add-order-modal.component';
import { Product } from '../../../shared/models/product.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    FilterControlsComponent,
    ProductCardComponent,
    AddProductModalComponent,
    EditProductModalComponent,
    ProductOrdersModalComponent,
    AddOrderModalComponent
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductManagementComponent implements OnInit {
  private productService = inject(ProductService);

  allProducts = signal<Product[]>([]);
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('All');
  showAddModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showOrdersModal = signal<boolean>(false);
  showAddOrderModal = signal<boolean>(false);
  selectedProduct = signal<Product | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  filterOptions = computed(() => {
    const categories = this.allProducts()
      .map(p => p.category)
      .filter(c => c && c.trim() !== ''); // Filter out empty or undefined categories
    return Array.from(new Set(categories));
  });

  filteredProducts = computed(() => {
    let list = this.allProducts();
    const query = this.searchQuery().toLowerCase();
    const type = this.selectedFilter();

    if (type !== 'All') {
      list = list.filter(p => p.category?.toLowerCase() === type.toLowerCase());
    }

    if (query) {
      list = list.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }
    return list;
  });

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading.set(true);
    this.error.set(null);
    this.productService.getProducts()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            this.allProducts.set(response.data);
          } else if (Array.isArray(response)) {
            this.allProducts.set(response);
          }
        },
        error: (err) => {
          console.error('Failed to load products', err);
          this.error.set('Could not fetch the product inventory.');
        }
      });
  }

  onDeleteProduct(id: string) {
    if (confirm('Delete this product?')) {
      this.productService.deleteProduct(id).subscribe({
        next: () => this.loadProducts(),
        error: (err) => alert('Action failed.')
      });
    }
  }

  openAddModal() {
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  openEditModal(product: Product) {
    this.selectedProduct.set(product);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedProduct.set(null);
  }

  openOrdersModal(product: Product) {
    this.selectedProduct.set(product);
    this.showOrdersModal.set(true);
  }

  closeOrdersModal() {
    this.showOrdersModal.set(false);
    this.selectedProduct.set(null);
  }

  openAddOrderModal(product: Product) {
    this.selectedProduct.set(product);
    this.showAddOrderModal.set(true);
  }

  closeAddOrderModal() {
    this.showAddOrderModal.set(false);
    this.selectedProduct.set(null);
  }

  onOrderCreated() {
    this.loadProducts(); // Refresh stock
  }
}
