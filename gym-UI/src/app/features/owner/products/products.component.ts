import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from './services/product.service';
import { PageHeaderComponent } from '../components/page-header/page-header.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { environment } from '../../../../environments/environment';
import { AddProductModalComponent } from './components/add-product-modal/add-product-modal.component';
import { EditProductModalComponent } from './components/edit-product-modal/edit-product-modal.component';
import { ProductOrdersModalComponent } from './components/product-orders-modal/product-orders-modal.component';
import { AddOrderModalComponent } from './components/add-order-modal/add-order-modal.component';
import { Product } from '../../../shared/models/product.model';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
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
  private authService = inject(AuthService);
  private confirmService = inject(ConfirmDialogService);

  /** Nutritionists may sell (orders) but cannot add/edit/delete catalog items (API + UI). */
  canManageInventory = computed(() => this.authService.userRole() !== 'nutritionist');

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

  // Pagination Signals
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(8);

  totalPages = computed(() => {
    return Math.ceil(this.filteredProducts().length / this.itemsPerPage()) || 1;
  });

  paginatedProducts = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredProducts().slice(startIndex, startIndex + this.itemsPerPage());
  });

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onFilterChange(category: string) {
    this.selectedFilter.set(category);
    this.currentPage.set(1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

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
          let data = response.data || response;
          if (Array.isArray(data)) {
            const mappedData = data.map(p => {
              let imageUrl = p.image || '';
              if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                const baseUrl = environment.apiUrl.replace('/api', '').replace(/\/$/, '');
                const cleanPath = imageUrl.replace(/^\//, '');
                imageUrl = `${baseUrl}/${cleanPath}`;
              }
              return { ...p, imageUrl };
            });
            this.allProducts.set(mappedData);
          }
        },
        error: (err) => {
          console.error('Failed to load products', err);
          this.error.set('Could not fetch the product inventory.');
        }
      });
  }

  onDeleteProduct(id: string) {
    this.confirmService.open({
      title: 'Remove Product',
      message: 'Are you sure you want to completely delete this product from the inventory?',
      confirmText: 'Delete Product',
      icon: 'delete',
      isDestructive: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.productService.deleteProduct(id).subscribe({
          next: () => this.loadProducts(),
          error: (err) => this.error.set('Action failed to delete product.')
        });
      }
    });
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
