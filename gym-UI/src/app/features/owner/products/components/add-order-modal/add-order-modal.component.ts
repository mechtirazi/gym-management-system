import { Component, input, output, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../../shared/models/product.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-add-order-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-order-modal.component.html',
  styleUrl: './add-order-modal.component.scss'
})
export class AddOrderModalComponent implements OnInit {
  private http = inject(HttpClient);
  
  product = input.required<Product>();
  close = output<void>();
  orderCreated = output<void>();

  members = signal<any[]>([]);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  // Use individual signals for better reactivity with computed
  idMember = signal<string>('');
  quantity = signal<number>(1);
  paymentMethod = signal<string>('cash');

  totalPrice = computed(() => {
    return this.quantity() * Number(this.product().price);
  });

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    
    this.http.get<any>(`${environment.apiUrl}/users`, { headers }).subscribe({
      next: (res) => {
        const users = res.data || (Array.isArray(res) ? res : []);
        this.members.set(users.filter((u: any) => u.role === 'member'));
      },
      error: (err) => {
        console.error('Failed to load members', err);
        this.error.set('Failed to load members list.');
      }
    });
  }

  onSubmit() {
    if (!this.idMember() || this.quantity() < 1) {
      this.error.set('Please select a valid member and quantity.');
      return;
    }

    if (this.quantity() > this.product().stock) {
      this.error.set(`Cannot order more than ${this.product().stock} units.`);
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    const payload = {
      order_date: new Date().toISOString().split('T')[0],
      status: 'completed',
      id_member: this.idMember(),
      payment_method: this.paymentMethod(),
      products: [
        {
          id_product: this.product().id_product,
          quantity: this.quantity(),
          price: this.product().price
        }
      ]
    };

    this.http.post<any>(`${environment.apiUrl}/orders`, payload, { headers }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.orderCreated.emit();
        this.close.emit();
      },
      error: (err) => {
        console.error('Order creation failed', err);
        this.error.set('Failed to create order. Please try again.');
        this.isSubmitting.set(false);
      }
    });
  }
}
