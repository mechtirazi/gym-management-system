import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export type PaymentDto = {
  id: string;
  public_id: string;
  external_reference?: string | null;
  status: {
    value: string;
    label: string;
    is_locked: boolean;
  };
  amount: {
    value: number;
    formatted: string;
  };
  category: {
    value: string;
    label: string;
  };
  gateway: {
    value: string;
    label: string;
  };
  member: {
    name: string;
    email: string | null;
  };
  date: string;
  is_editable: boolean;
  product?: {
    id: string;
    name: string;
  } | null;
  gym_name: string;
  processed_by: string;
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

  listByGym(
    idGym: string, 
    page: number = 1, 
    perPage: number = 10, 
    startDate?: string, 
    endDate?: string,
    status?: string,
    gateway?: string,
    search?: string
  ) {
    let params = new HttpParams()
      .set('id_gym', idGym)
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (status) params = params.set('status', status);
    if (gateway) params = params.set('gateway', gateway);
    if (search) params = params.set('search', search);
      
    return this.http.get<ApiResponse<PaymentDto[]>>(this.baseUrl, { params }).pipe(
      map((r: any) => ({
        data: r?.data ?? [],
        meta: {
          current_page: r?.current_page || r?.meta?.current_page || 1,
          last_page: r?.last_page || r?.meta?.last_page || 1,
          total: r?.total || r?.meta?.total || 0,
          per_page: r?.per_page || r?.meta?.per_page || 10,
        },
        financial_summary: r?.financial_summary || null
      }))
    );
  }

  checkHealth() {
    return this.http.get<any>(`${environment.apiUrl}/health`);
  }

  getStats() {
    return this.http.get<any>(`${environment.apiUrl}/receptionist/dashboard-stats`);
  }

  create(payload: { member_id: string; id_gym: string; amount: number; gateway: string; category?: string | null; id_product?: string | null; external_reference?: string | null }) {
    return this.http.post<ApiResponse<PaymentDto>>(this.baseUrl, payload);
  }

  update(id_payment: string, payload: Partial<{ member_id: string; id_gym: string; amount: number; gateway: string; category?: string | null; id_product?: string | null; external_reference?: string | null }>) {
    return this.http.put<ApiResponse<PaymentDto>>(`${this.baseUrl}/${id_payment}`, payload);
  }
}

