import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GymNotification } from '../../shared/models/notification.model';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = `${environment.apiUrl}/notifications`;

  // State
  private _notifications = signal<GymNotification[]>([]);

  // Public exposure
  notifications = this._notifications.asReadonly();
  unreadNotifications = computed(() => this._notifications().filter(n => n.unread));
  unreadCount = computed(() => this.unreadNotifications().length);
  hasUnread = computed(() => this.unreadCount() > 0);

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.fetchNotifications().subscribe();
      } else {
        this._notifications.set([]);
      }
    });
  }

  fetchNotifications(): Observable<GymNotification[]> {
    return this.http.get<any>(this.API_URL).pipe(
      map(response => {
        const data = Array.isArray(response) ? response : response.data || [];
        // Sort by created_at descending if available
        data.sort((a: any, b: any) => {
          if (!a.created_at || !b.created_at) return 0;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        const mapped = data.map((n: any) => this.mapNotification(n));
        this._notifications.set(mapped);
        return mapped;
      })
    );
  }

  markAsRead(id: string): void {
    this.http.post(`${this.API_URL}/${id}/read`, {}).subscribe({
      next: () => {
        this._notifications.update(notifs =>
          notifs.map(n => n.id === id ? { ...n, unread: false } : n)
        );
      }
    });
  }

  markAllAsRead(): void {
    this.http.post(`${this.API_URL}/read-all`, {}).subscribe({
      next: () => {
        this._notifications.update(notifs =>
          notifs.map(n => ({ ...n, unread: false }))
        );
      }
    });
  }

  addNotification(notification: Omit<GymNotification, 'id' | 'unread' | 'time'>): void {
    // This can be used to send a notification to the server if needed, 
    // but usually notifications are triggered by backend events.
    // For now, let's keep it as local addition for UI feedback or implement backend call
    const payload = {
      title: notification.title,
      text: notification.description,
      type: notification.type,
    };

    this.http.post(this.API_URL, payload).subscribe({
      next: (response: any) => {
        const newNotif = this.mapNotification(response.data || response);
        this._notifications.update(notifs => [newNotif, ...notifs]);
      }
    });
  }

  getNotifications(): Observable<any[]> {
    return this.http.get<any>(this.API_URL).pipe(
      map(response => response.data || response)
    );
  }

  sendToAllUsers(text: string, type: string = 'info'): Observable<any> {
    return this.http.post(`${environment.apiUrl}/admin/notifications/all`, { text, type });
  }

  sendToOwner(ownerId: string, text: string, type: string = 'info'): Observable<any> {
    return this.http.post(`${environment.apiUrl}/admin/notifications/owner/${ownerId}`, { text, type });
  }

  sendToUser(userId: string, text: string, type: string = 'info'): Observable<any> {
    // Uses the generic store endpoint which requires id_user and text
    return this.http.post(`${this.API_URL}`, { id_user: userId, text: text, type: type });
  }

  contactSupport(message: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/support/contact`, { message });
  }

  private mapNotification(n: any): GymNotification {
    return {
      id: n.id_notification,
      title: n.title || 'Notification',
      description: n.text,
      time: this.formatTime(n.created_at),
      unread: !n.is_read,
      type: n.type || 'info'
    };
  }

  private formatTime(dateStr: string): string {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  }
}
