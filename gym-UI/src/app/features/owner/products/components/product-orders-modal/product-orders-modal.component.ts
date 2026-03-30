import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { finalize } from 'rxjs';
import { Product } from '../../../../../shared/models/product.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-product-orders-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-orders-modal.component.html',
  styleUrl: './product-orders-modal.component.scss'
})
export class ProductOrdersModalComponent implements OnInit {
  private productService = inject(ProductService);
  private http = inject(HttpClient);

  product = input.required<Product>();
  close = output<void>();

  orders = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading.set(true);
    this.productService.getProductOrders(this.product().id_product)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.orders.set(res.data || []);
        },
        error: (err) => {
          console.error('Failed to load product orders', err);
          this.error.set('Failed to load orders history.');
        }
      });
  }

  deleteOrder(orderId: string) {
    if (!confirm('Are you sure you want to delete this order?')) {
      return;
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.delete(`${environment.apiUrl}/orders/${orderId}`, { headers }).subscribe({
      next: () => {
        // Remove from list
        this.orders.set(this.orders().filter(o => o.id_order !== orderId));
      },
      error: (err) => {
        console.error('Failed to delete order', err);
        alert('Failed to delete order.');
      }
    });
  }

  printTicket(order: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptContent = `
      <html>
      <head>
        <title>Receipt - Order #${order.id_order.substring(0, 8)}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 1.4em; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 0.9em; }
          .total { font-weight: bold; font-size: 1.1em; margin-top: 10px; }
          .footer { text-align: center; margin-top: 30px; font-size: 0.8em; }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>GYM RECEIPT</h2>
          <p>Order #${order.id_order.substring(0, 8)}</p>
          <p>Date: ${new Date(order.order_date).toLocaleDateString()}</p>
        </div>
        
        <div class="row">
          <span>Customer:</span>
          <span>${order.member?.name || ''} ${order.member?.last_name || ''}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row" style="font-weight: bold">
          <span>Item</span>
          <span>Qty</span>
          <span>Price</span>
        </div>
        <div class="row">
          <span>${this.product().name}</span>
          <span>x${order.pivot?.quantity || 1}</span>
          <span>$${order.pivot?.price || order.total_amount}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row total">
          <span>Total</span>
          <span>$${order.total_amount || order.pivot?.price}</span>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
        </div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptContent);
    printWindow.document.close();
  }
}
