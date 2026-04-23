import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../shared/models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  updateProfile(id: string, userData: any): Observable<any> {
    // If userData contains a file, we should use FormData
    if (userData.profile_picture instanceof File) {
      const formData = new FormData();
      Object.keys(userData).forEach(key => {
        if (userData[key] !== null && userData[key] !== undefined) {
          formData.append(key, userData[key]);
        }
      });
      // Laravel requires _method=PUT for FormData since it doesn't support multipart/form-data for actual PUT requests
      formData.append('_method', 'PUT');
      return this.http.post<any>(`${this.apiUrl}/${id}`, formData);
    }
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, userData);
  }

  changePassword(id: string, passwordData: any): Observable<any> {
    // We can also use the update endpoint for password if needed, 
    // but usually it's cleaner to have a dedicated endpoint if the backend has one.
    // Based on UserController, the generic update handles it.
    return this.http.put<any>(`${this.apiUrl}/${id}`, {
      password: passwordData.newPassword,
      password_confirmation: passwordData.confirmPassword,
      current_password: passwordData.currentPassword
    });
  }

  createUser(userData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, userData);
  }
}
