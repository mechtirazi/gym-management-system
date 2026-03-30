import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // NOTE: No manual authHeaders needed here.
  // The JwtInterceptor automatically attaches:
  //   - Authorization: Bearer <token>
  //   - X-Gym-Id: <active gym id>
  // to every HTTP request, ensuring the backend scopes data correctly.

  getProducts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/products`);
  }

  createProduct(product: any): Observable<any> {
    const activeGymId = this.authService.connectedGymId();
    if (!activeGymId) {
      throw new Error('No active gym selected. Please switch to a gym first.');
    }
    const payload = { ...product, id_gym: activeGymId };
    return this.http.post<any>(`${this.apiUrl}/products`, payload);
  }

  updateProduct(id: string, product: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/products/${id}`, product);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}`);
  }

  getProductOrders(productId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/products/${productId}/orders`);
  }

  getOrders(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/orders`);
  }
}
