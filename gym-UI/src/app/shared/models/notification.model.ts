export interface GymNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}
