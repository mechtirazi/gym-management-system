import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AdminOwnersService } from '../../../core/services/admin-owners.service';
import { TrainerService } from '../../trainer/services/trainer.service';
import { StaffService } from '../../owner/staff/services/staff.service';
import { MemberService } from '../../owner/member/services/member.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RecipientTarget, StaffInvitation } from './notifications.model';
import { GymNotification } from '../../../shared/models/notification.model';

@Injectable()
export class NotificationFeatureService {
  private authService = inject(AuthService);
  private ownersService = inject(AdminOwnersService);
  private trainerService = inject(TrainerService);
  private staffService = inject(StaffService);
  private memberService = inject(MemberService);
  private coreNotifService = inject(NotificationService);

  // State
  private _targets = signal<RecipientTarget[]>([]);
  private _invitations = signal<StaffInvitation[]>([]);
  
  // Public Signals
  targets = this._targets.asReadonly();
  invitations = this._invitations.asReadonly();
  notifications = this.coreNotifService.notifications;
  unreadCount = this.coreNotifService.unreadCount;

  // Role Helpers
  currentUser = this.authService.currentUser;
  
  isSuperAdmin = computed(() => this.currentUser()?.role === 'super_admin');
  isAdmin = computed(() => ['admin', 'super_admin'].includes(this.currentUser()?.role || ''));
  isOwner = computed(() => this.currentUser()?.role === 'owner');
  isTrainer = computed(() => this.currentUser()?.role === 'trainer');
  isReceptionist = computed(() => this.currentUser()?.role === 'receptionist');
  isMember = computed(() => this.currentUser()?.role === 'member');

  loadInitialData() {
    this.loadTargets();
    this.loadInvitations();
  }

  loadInvitations() {
    this.staffService.getInvitations().subscribe({
      next: (res: any) => {
        if (res.success) {
          this._invitations.set(res.data);
        }
      }
    });
  }

  loadTargets() {
    if (this.isAdmin()) {
      this.ownersService.getOwners().subscribe(owners => {
        this._targets.set(owners as RecipientTarget[]);
      });
    } else if (this.isTrainer()) {
      this.trainerService.getAttendances().subscribe({
        next: (res: any) => {
          if (res?.data) {
            const map = new Map<string, any>();
            res.data.forEach((a: any) => {
              if (a.member && !map.has(a.member.id_user)) {
                map.set(a.member.id_user, a.member);
              }
            });
            this._targets.set(Array.from(map.values()));
          }
        }
      });
    } else if (this.isOwner() || this.isReceptionist()) {
      const requests: any = {
        staff: this.staffService.getStaff(1, 100)
      };
      
      if (this.isOwner()) {
        requests['members'] = this.memberService.getMembers(1, 100);
      }

      forkJoin(requests).subscribe({
        next: (res: any) => {
          const combinedTargets: RecipientTarget[] = [];
          
          if (res.staff?.data) {
            res.staff.data.forEach((s: any) => {
              if (s.user) {
                combinedTargets.push({ ...s.user, role: s.role || 'staff' });
              }
            });
          }
          
          if (res.members?.data) {
            res.members.data.forEach((m: any) => {
              if (m.member) {
                combinedTargets.push({ ...m.member, role: 'member' });
              }
            });
          }
          
          this._targets.set(combinedTargets);
        }
      });
    }
  }

  acceptInvitation(invitation: StaffInvitation): Observable<any> {
    return this.staffService.joinGym(invitation).pipe(
      map(res => {
        this.loadInvitations();
        this.coreNotifService.fetchNotifications().subscribe();
        return res;
      })
    );
  }

  declineInvitation(id: string): Observable<any> {
    return this.staffService.declineInvitation(id).pipe(
      map(res => {
        this.loadInvitations();
        this.coreNotifService.fetchNotifications().subscribe();
        return res;
      })
    );
  }

  acceptInviteFromAction(notif: GymNotification): Observable<any> {
    const parts = notif.type?.split(':');
    if (!parts || parts.length < 3) return of(null);

    const payload = {
      id_notification: notif.id,
      id_gym: parts[1],
      role: parts[2]
    };

    return this.staffService.joinGym(payload).pipe(
      map(res => {
        this.coreNotifService.fetchNotifications().subscribe();
        return res;
      })
    );
  }

  dispatchNotification(payload: { id_user: string, message: string, type: string }): Observable<any> {
    return this.coreNotifService.sendToUser(payload.id_user, payload.message, payload.type);
  }

  broadcastToAll(message: string, type: string): Observable<any> {
    return this.coreNotifService.sendToAllUsers(message, type);
  }

  markAsRead(id: string) {
    this.coreNotifService.markAsRead(id);
  }
}
