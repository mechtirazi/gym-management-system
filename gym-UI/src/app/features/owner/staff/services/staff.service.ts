import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, map, throwError, of, catchError } from 'rxjs';
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
  
  findUserByEmail(email: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/search-by-email?email=${email}`, { headers: this.authHeaders });
  }

  private get authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const gymId = this.authService.currentUser()?.gym_id;
    let headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    if (gymId) {
      headers = headers.set('X-Gym-Id', gymId.toString());
    }
    return headers;
  }

  // ─── Fetch owner's priority gym ID ───────────────────────────────────────
  /**
   * Prioritizes the currently connected gym from AuthService.
   * If none is selected, fetches all gyms and picks the first active one.
   */
  getOwnerGymId(): Observable<string> {
    const currentGymId = this.authService.currentUser()?.gym_id;
    if (currentGymId) {
      return of(currentGymId.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/gyms`, { headers: this.authHeaders }).pipe(
      map((res: any) => {
        const gyms: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        if (!gyms.length) {
          throw new Error('No gym found for this owner. Please create a gym first.');
        }
        
        // Prefer an active gym, otherwise fallback to the first one
        const targetGym = gyms.find(g => g.status === 'active') || gyms[0];
        const gymId = targetGym?.id_gym;

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
    name?: string;
    last_name?: string;
    email: string;
    phone?: string;
    role: string;
    password?: string;
  }, isExistingUserMode: boolean = false): Observable<any> {
    const registerPayload = {
      name: member.name || '',
      last_name: member.last_name || '',
      email: member.email,
      password: member.password || '',
      password_confirmation: member.password || '',
      phone: member.phone || null,
      role: member.role
    };

    return this.getOwnerGymId().pipe(
      switchMap((gymId: string) => {
        // Step 1: Try to hire directly by email (handles invitation if user exists)
        const hirePayload = {
          email: member.email,
          id_gym: gymId,
          role: member.role
        };

        return this.http.post<any>(`${this.apiUrl}/gym-staff`, hirePayload, { headers: this.authHeaders }).pipe(
          switchMap((res: any) => {
            // Case 1: User already existed and was invited (or linked if backend allowed)
            if (res.invitation) {
              return of(res);
            }
            return of(res);
          }),
          // Case 2: User does not exist (404 from our new backend logic)
          // We then proceed with the original registration + linking flow
          catchError((err) => {
            if (isExistingUserMode) {
              // If we only intended to invite an existing user, abort if not found
              if (err.status === 404) {
                return throwError(() => new Error('User not found. Please switch to New Hire mode or check the email.'));
              }
              return throwError(() => err);
            }

            if (err.status === 404 || err.status === 422) {
              // User doesn't exist or other error, try registration flow
              return this.http.post<any>(`${this.apiUrl}/auth/register`, registerPayload, { headers: this.authHeaders }).pipe(
                switchMap((registerRes: any) => {
                  const userId: string | null =
                    registerRes?.data?.user?.id_user ??
                    registerRes?.data?.user?.id ??
                    registerRes?.user?.id_user ??
                    registerRes?.id_user ??
                    null;

                  if (!userId) {
                    return throwError(() => new Error('Registration succeeded but user ID could not be extracted.'));
                  }

                  // Step 3: Link the newly registered user
                  return this.http.post<any>(
                    `${this.apiUrl}/gym-staff`,
                    { id_gym: gymId, id_user: userId }, // Omit email to enforce direct link
                    { headers: this.authHeaders }
                  );
                })
              );
            }
            // Real error (unauthorized, etc.)
            return throwError(() => err);
          })
        );
      })
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

  // ─── Invitations ─────────────────────────────────────────────────────────
  
  getInvitations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gym-staff/invitations`, { headers: this.authHeaders });
  }

  joinGym(invitation: any): Observable<any> {
    const payload = {
      id_gym: invitation.id_gym,
      role: invitation.role,
      id_notification: invitation.id_notification
    };
    return this.http.post<any>(`${this.apiUrl}/gym-staff/join`, payload, { headers: this.authHeaders });
  }

  declineInvitation(notifId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/gym-staff/decline`, { id_notification: notifId }, { headers: this.authHeaders });
  }
}
