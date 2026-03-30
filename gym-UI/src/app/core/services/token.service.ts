import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'admin_access_token';

  /** Saves token to localStorage */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /** Retrieves token from localStorage */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** Removes token */
  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /** Checks if a token broadly exists (does not validate expiry here) */
  hasToken(): boolean {
    return !!this.getToken();
  }
}
