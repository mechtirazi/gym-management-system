import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export type PaymentDto = {
  id_payment: string;
  id_user: string;
  id_gym: string;
  amount: number;
  method: string;
  type?: string | null;
  id_transaction: string;
  created_at?: string;
  member?: { name: string; email: string };
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string } & Record<string, any>;

@Injectable({ providedIn: 'root' })
export class ReceptionistPaymentsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/payments`;

  list() {
    return this.http.get<ApiResponse<PaymentDto[]>>(this.baseUrl).pipe(
      map((r: any) => r?.data ?? [])
    );
  }

  listByGym(idGym: string, page: number = 1, perPage: number = 10, startDate?: string, endDate?: string) {
    let params = new HttpParams()
      .set('id_gym', idGym)
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
      
    return this.http.get<ApiResponse<PaymentDto[]>>(this.baseUrl, { params }).pipe(
      map((r: any) => ({
        data: r?.data ?? [],
        meta: {
          current_page: r?.current_page || 1,
          last_page: r?.last_page || 1,
          total: r?.total || 0,
          per_page: r?.per_page || 10,
          todays_total: r?.todays_total || 0
        }
      }))
    );
  }

  checkHealth() {
    return this.http.get<any>(`${environment.apiUrl}/health`);
  }

  getStats() {
    return this.http.get<any>(`${environment.apiUrl}/receptionist/dashboard-stats`);
  }

  create(payload: { id_user: string; id_gym: string; amount: number; method: string; type?: string | null; id_transaction: string }) {
    return this.http.post<ApiResponse<PaymentDto>>(this.baseUrl, payload);
  }

  update(id_payment: string, payload: Partial<{ id_user: string; id_gym: string; amount: number; method: string; type?: string | null; id_transaction: string }>) {
    return this.http.put<ApiResponse<PaymentDto>>(`${this.baseUrl}/${id_payment}`, payload);
  }
}

