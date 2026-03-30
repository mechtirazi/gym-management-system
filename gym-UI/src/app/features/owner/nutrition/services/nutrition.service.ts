import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { NutritionPlan } from '../../../../shared/models/nutrition.model';
import { AuthService } from '../../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class NutritionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // NOTE: No manual authHeaders needed here.
  // The JwtInterceptor automatically attaches:
  //   - Authorization: Bearer <token>
  //   - X-Gym-Id: <active gym id>
  // to every HTTP request, ensuring the backend scopes data correctly.

  getNutritionPlans(page: number = 1, perPage: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/nutrition-plans?page=${page}&per_page=${perPage}`);
  }

  createNutritionPlan(plan: NutritionPlan): Observable<any> {
    const activeGymId = this.authService.connectedGymId();
    if (!activeGymId) {
      throw new Error('No active gym selected. Please switch to a gym first.');
    }
    const payload = { ...plan, id_gym: activeGymId };
    return this.http.post(`${this.apiUrl}/nutrition-plans`, payload);
  }

  updateNutritionPlan(id: string, plan: NutritionPlan): Observable<any> {
    return this.http.put(`${this.apiUrl}/nutrition-plans/${id}`, plan);
  }

  getUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users`);
  }

  deleteNutritionPlan(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/nutrition-plans/${id}`);
  }
}
