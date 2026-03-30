import { User } from './user.model';
import { Gym } from './gym.model';

export type SubscriptionStatus = 'inactive' | 'active' | 'expired' | 'cancelled' | 'paused';

export interface Subscription {
  id_subscribe: string;
  id_gym: string;
  id_user: string;
  status: SubscriptionStatus;
  subscribe_date: string;
  created_at?: string;
  updated_at?: string;
  user?: User;
  gym?: Gym;
}

export interface SubscriptionResponse {
  success: boolean;
  message: string;
  data: Subscription[];
}
