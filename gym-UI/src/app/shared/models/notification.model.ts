export interface User {
  id_user?: string;
  name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  profile_picture?: string;
}

export interface GymNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'info' | 'success' | 'warning' | 'error' | 'support_ticket';
  sender?: User;
  link?: string;
}
