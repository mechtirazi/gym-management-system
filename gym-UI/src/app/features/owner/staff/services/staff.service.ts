import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, map, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { StaffMember } from '../../../../shared/models/staff-member.model';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private get authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // ─── Fetch owner's first gym id_gym ──────────────────────────────────────
  /**
   * The backend scopes /gyms to the authenticated owner automatically.
   * We take the first gym's id_gym.
   */
  getOwnerGymId(): Observable<string> {
    return this.http.get<any>(`${this.apiUrl}/gyms`, { headers: this.authHeaders }).pipe(
      map((res: any) => {
        // Response can be { data: [...] } or an array directly
        const gyms: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        if (!gyms.length) {
          throw new Error('No gym found for this owner. Please create a gym first.');
        }
        const gymId = gyms[0]?.id_gym;
        if (!gymId) {
          throw new Error('Could not resolve gym ID.');
        }
        return gymId as string;
      })
    );
  }

  // ─── Get all staff ────────────────────────────────────────────────────────
  getStaff(page: number = 1, perPage: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gym-staff?page=${page}&per_page=${perPage}`, { headers: this.authHeaders });
  }

  // ─── Add staff (3-step: get gym → register user → link to gym) ───────────
  /**
   * Step 1: Resolve the owner's gym id_gym
   * Step 2: Register the new user via /auth/register
   * Step 3: POST /gym-staff with { id_gym, id_user }
   *
   * Backend field names confirmed from RegisterRequest.php & StoreGymStaffRequest.php:
   *  - Register : name, last_name, email, password, password_confirmation, phone?, role
   *  - GymStaff : id_gym, id_user
   *  - Valid roles: trainer | receptionist | nutritionist | owner | member
   */
  addStaff(member: {
    name: string;
    last_name: string;
    email: string;
    phone: string;
    role: string;
    password: string;
  }): Observable<any> {
    const registerPayload = {
      name: member.name,
      last_name: member.last_name,
      email: member.email,
      password: member.password,
      password_confirmation: member.password,
      phone: member.phone || null,
      role: member.role
    };

    // Step 1: get gym id
    return this.getOwnerGymId().pipe(
      switchMap((gymId: string) =>
        // Step 2: register the new user (no auth header needed – public route)
        this.http.post<any>(`${this.apiUrl}/auth/register`, registerPayload).pipe(
          switchMap((registerRes: any) => {
            // Extract id_user from the register response: { data: { user: { id_user } } }
            const userId: string | null =
              registerRes?.data?.user?.id_user ??
              registerRes?.data?.user?.id ??
              registerRes?.user?.id_user ??
              registerRes?.id_user ??
              null;

            if (!userId) {
              return throwError(() =>
                new Error('Registration succeeded but user ID could not be extracted.')
              );
            }

            // Step 3: link user to gym staff
            const staffPayload = { id_gym: gymId, id_user: userId };
            return this.http.post<any>(
              `${this.apiUrl}/gym-staff`,
              staffPayload,
              { headers: this.authHeaders }
            );
          })
        )
      )
    );
  }

  // ─── Delete staff ─────────────────────────────────────────────────────────
  deleteStaff(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/gym-staff/${id}`, { headers: this.authHeaders });
  }

  // ─── Update staff ─────────────────────────────────────────────────────────
  updateStaff(userId: string, member: Partial<StaffMember>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${userId}`, member, { headers: this.authHeaders });
  }
}
