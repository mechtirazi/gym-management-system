import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, UserVm, OwnerCreatePayload, OwnerUpdatePayload, GymDto } from '../models/api.models';
import { mapUserToVm } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class AdminOwnersService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/admin/owners`;

  getOwners(): Observable<UserVm[]> {
    return this.http.get<ApiResponse<UserVm[]>>(this.url).pipe(
      map(res => {
         return (res.data || []).map(mapUserToVm);
      })
    );
  }
  
  getGymsByOwner(ownerId: string | number): Observable<GymDto[]> {
    return this.http.get<ApiResponse<GymDto[]>>(`${this.url}/${ownerId}/gyms`).pipe(
      map(res => res.data || [])
    );
  }

  createGymForOwner(payload: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/gyms`, payload);
  }

  disableAllGyms(ownerId: string | number): Observable<any> {
    return this.http.post(`${this.url}/${ownerId}/disable-gyms`, {});
  }

  activateAllGyms(ownerId: string | number): Observable<any> {
    return this.http.post(`${this.url}/${ownerId}/activate-gyms`, {});
  }

  // Unverified computation done here for components
  getAllUsers(): Observable<UserVm[]> {
     return this.http.get<ApiResponse<UserVm[]>>(`${environment.apiUrl}/users`).pipe(map(r => (r.data || []).map(mapUserToVm)));
  }

  getOwner(id: string): Observable<UserVm> {
    return this.http.get<ApiResponse<UserVm>>(`${this.url}/${id}`).pipe(map(r => mapUserToVm(r.data)));
  }

  createOwner(payload: OwnerCreatePayload): Observable<UserVm> {
    return this.http.post<ApiResponse<UserVm>>(this.url, { ...payload, role: 'owner' }).pipe(map(r => mapUserToVm(r.data)));
  }

  updateOwner(id: string, payload: OwnerUpdatePayload): Observable<UserVm> {
    return this.http.patch<ApiResponse<UserVm>>(`${this.url}/${id}`, payload).pipe(map(r => mapUserToVm(r.data)));
  }

  deleteOwner(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
