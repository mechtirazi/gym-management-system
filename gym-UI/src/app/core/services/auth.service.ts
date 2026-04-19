import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../../shared/models/user.model';
import { Router, Params } from '@angular/router';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;

  // State using Signals
  currentUser = signal<User | null>(this.getUserFromStorage());
  isAuthenticated = computed(() => !!this.currentUser());
  userRole = computed(() => this.currentUser()?.role);
  connectedGymId = computed(() => this.currentUser()?.gym_id);
  connectedGymStatus = computed(() => this.currentUser()?.gym_status || 'active');
  connectedGymSuspensionReason = computed(() => this.currentUser()?.gym_suspension_reason);

  constructor(private http: HttpClient, private router: Router) {
    this.checkAndSetDefaultGym();
  }

  getApiUrl(): string {
    return this.API_URL;
  }

  handleSocialLogin(params: Params): boolean {
    const token = params['token'];
    const userParam = params['u'] || params['user'];

    if (!token || !userParam) return false;

    try {
      const isBase64 = !!params['u'];
      const userStr = isBase64 ? atob(userParam) : userParam;
      const user = JSON.parse(userStr);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', userStr);
      this.currentUser.set(user);
      return true;
    } catch (e) {
      console.error('Social login parsing error:', e);
      return false;
    }
  }

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials).pipe(
      tap(response => this.handleAuthentication(response))
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, userData).pipe(
      tap(response => this.handleAuthentication(response))
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  updateCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  switchGym(gymId: string, status: string = 'active', reason: string = ''): void {
    const user = this.currentUser();
    if (user) {
      const updatedUser = { 
        ...user, 
        gym_id: gymId, 
        gym_status: status as any,
        gym_suspension_reason: reason 
      };
      this.updateCurrentUser(updatedUser);
      // Reload is necessary to force all services/components to re-fetch data for the new gym context
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private handleAuthentication(response: AuthResponse): void {
    if (response.success && response.data) {
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUser.set(user);
      
      // Auto-set default gym if user has none
      const staffRoles = ['owner', 'trainer', 'nutritionist', 'receptionist'];
      if (staffRoles.includes(user.role) && !user.gym_id) {
        this.checkAndSetDefaultGym();
      }
    }
  }

  private checkAndSetDefaultGym(): void {
    const user = this.currentUser();
    const staffRoles = ['owner', 'trainer', 'nutritionist', 'receptionist'];
    
    if (user && staffRoles.includes(user.role) && !user.gym_id) {
      this.http.get<any>(`${this.API_URL}/gyms`).subscribe({
        next: (res) => {
          if (res.success && res.data && res.data.length > 0) {
            // Pick the first ACTIVE gym for default selection
            const activeGym = res.data.find((g: any) => g.status === 'active') || res.data[0];
            this.switchGym(activeGym.id_gym, activeGym.status, activeGym.suspension_reason);
          }
        },
        error: (err) => console.error('Error fetching gyms for default selection:', err)
      });
    }
  }

  private getUserFromStorage(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr || userStr === 'undefined') {
        return null;
      }
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from storage', error);
      localStorage.removeItem('user');
      return null;
    }
  }

  impersonate(userId: string, targetName: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/admin/impersonate/${userId}`, {}).pipe(
      tap(res => {
        if (res.success && res.data) {
          // Save original user if not already impersonating
          if (!localStorage.getItem('original_user')) {
            localStorage.setItem('original_user', JSON.stringify(this.currentUser()));
            localStorage.setItem('original_token', localStorage.getItem('token') || '');
          }
          
          this.handleAuthentication(res);
          // Force dashboard redirect
          this.router.navigate(['/owner/dashboard']).then(() => {
             window.location.reload(); 
          });
        }
      })
    );
  }

  stopImpersonation(): void {
    const originalUser = localStorage.getItem('original_user');
    const originalToken = localStorage.getItem('original_token');

    if (originalUser) {
      localStorage.removeItem('original_user');
      localStorage.removeItem('original_token');
      
      const user = JSON.parse(originalUser);
      this.currentUser.set(user);
      localStorage.setItem('user', originalUser);
      
      if (originalToken) {
        localStorage.setItem('token', originalToken);
      }
      
      this.router.navigate(['/admin/dashboard']).then(() => {
         window.location.reload();
      });
    } else {
      this.logout();
    }
  }

  getAvatarUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = this.API_URL.replace('/api', '');
    return `${baseUrl}/storage/${path}`;
  }
}
