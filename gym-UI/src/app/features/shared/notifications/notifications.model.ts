import { UserVm } from '../../../core/models/api.models';

export type NotificationLogFilter = 'all' | 'unread';
export type RecipientType = 'all' | 'staff' | 'members' | 'single';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface StaffInvitation {
  id_notification: string;
  id_gym?: string;
  gym_name?: string;
  role: string;
  type?: string;
}

export interface RecipientTarget extends UserVm {
  role: string | null;
}

export interface DispatchPayload {
  recipientType: RecipientType;
  type: NotificationType;
  targetId: string;
  message: string;
}
