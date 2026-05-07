import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin, map, Observable, of, finalize, switchMap } from 'rxjs';
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
  targets = computed(() => {
    const currentId = this.authService.currentUser()?.id_user;
    return this._targets().filter(t => t.id_user !== currentId);
  });
  invitations = this._invitations.asReadonly();
  notifications = this.coreNotifService.notifications;
  unreadCount = this.coreNotifService.unreadCount;
  processingIds = signal<Set<string>>(new Set());

  startProcessing(id: string) {
    this.processingIds.update(set => {
      const newSet = new Set(set);
      newSet.add(id);
      return newSet;
    });
  }

  stopProcessing(id: string) {
    this.processingIds.update(set => {
      const newSet = new Set(set);
      newSet.delete(id);
      return newSet;
    });
  }

  isProcessing(id: string): boolean {
    return this.processingIds().has(id);
  }

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
                const actualRole = s.user.role || s.role || 'staff';
                combinedTargets.push({ ...s.user, role: actualRole });
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
    this.startProcessing(invitation.id_notification);
    return this.staffService.joinGym(invitation).pipe(
      switchMap(res => {
        this.loadInvitations();
        return this.coreNotifService.fetchNotifications().pipe(
          map(() => res)
        );
      }),
      finalize(() => this.stopProcessing(invitation.id_notification))
    );
  }

  declineInvitation(id: string): Observable<any> {
    this.startProcessing(id);
    return this.staffService.declineInvitation(id).pipe(
      switchMap(res => {
        this.loadInvitations();
        return this.coreNotifService.fetchNotifications().pipe(
          map(() => res)
        );
      }),
      finalize(() => this.stopProcessing(id))
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

    this.startProcessing(notif.id);
    return this.staffService.joinGym(payload).pipe(
      switchMap(res => {
        this.loadInvitations();
        return this.coreNotifService.fetchNotifications().pipe(
          map(() => res)
        );
      }),
      finalize(() => this.stopProcessing(notif.id))
    );
  }

  dispatchNotification(payload: { id_user: string, message: string, type: string }): Observable<any> {
    return this.coreNotifService.sendToUser(payload.id_user, payload.message, payload.type);
  }

  broadcastToAll(message: string, type: string): Observable<any> {
    return this.coreNotifService.sendToAllUsers(message, type);
  }

  broadcastToOwners(message: string, type: string): Observable<any> {
    return this.coreNotifService.sendToAllOwners(message, type);
  }

  markAsRead(id: string) {
    this.coreNotifService.markAsRead(id);
  }
}
