import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NutritionPlan } from '../../../shared/models/nutrition.model';

export interface ApiListResponse<T> {
  success?: boolean;
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NutritionistNutritionService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getClients(page: number = 1, perPage: number = 50): Observable<ApiListResponse<any>> {
    return this.http.get<ApiListResponse<any>>(`${this.apiUrl}/users?page=${page}&per_page=${perPage}`);
  }

  getNutritionPlans(page: number = 1, perPage: number = 10): Observable<ApiListResponse<NutritionPlan>> {
    return this.http.get<ApiListResponse<NutritionPlan>>(`${this.apiUrl}/nutrition-plans?page=${page}&per_page=${perPage}`);
  }

  createNutritionPlan(payload: Partial<NutritionPlan> & { id_gym: number | string }): Observable<NutritionPlan> {
    return this.http.post<NutritionPlan>(`${this.apiUrl}/nutrition-plans`, payload);
  }

  updateNutritionPlan(id: string, payload: Partial<NutritionPlan>): Observable<NutritionPlan> {
    return this.http.put<NutritionPlan>(`${this.apiUrl}/nutrition-plans/${id}`, payload);
  }

  deleteNutritionPlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/nutrition-plans/${id}`);
  }
}

