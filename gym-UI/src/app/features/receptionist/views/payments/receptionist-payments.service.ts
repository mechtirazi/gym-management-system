import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export type PaymentDto = {
  id_payment: string;
  id_user: string;
  amount: number;
  method: string;
  type?: string | null;
  id_transaction: string;
  created_at?: string;
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

  create(payload: { id_user: string; amount: number; method: string; type?: string | null; id_transaction: string }) {
    return this.http.post<ApiResponse<PaymentDto>>(this.baseUrl, payload);
  }

  update(id_payment: string, payload: Partial<{ id_user: string; amount: number; method: string; type?: string | null; id_transaction: string }>) {
    return this.http.put<ApiResponse<PaymentDto>>(`${this.baseUrl}/${id_payment}`, payload);
  }
}

