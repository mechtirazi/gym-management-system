export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  email_not_verified?: boolean;
  errors?: Record<string, string[]>;
}

export interface ApiAuthData {
  user?: UserVm;
  access_token?: string;
  token_type?: 'Bearer';
}

// User representation based on authenticated me response
export interface UserVm {
  id_user: string;
  name: string;
  last_name: string;
  email: string;
  role: string | null;
  phone: string | null;
  creation_date: string | null;
  email_verified_at?: string | null;
  provider?: string | null;
  provider_id?: string | null;
  created_at: string;
  updated_at: string;
  profile_picture?: string | null;
  owned_gyms_count?: number;
  active_gyms_count?: number;
}

// Keep field names reflecting backend contract
export interface OwnerCreatePayload {
  name: string;
  last_name: string;
  email: string;
  password?: string;
  role: 'owner';
  phone?: string;
  creation_date?: string;
  profile_picture?: string;
}

export interface OwnerUpdatePayload extends Omit<OwnerCreatePayload, 'creation_date' | 'role'> {
  role?: string;
}

export interface GymDto {
  id_gym: string;
  name: string;
  adress: string;
  capacity: number;
  open_mon_fri?: string;
  open_sat?: string;
  open_sun?: string;
  id_owner: string;
  phone?: string;
  picture?: string;
  plan: 'basic' | 'pro';
  members_count: number;
  active_members_count?: number;
  status: 'active' | 'suspended' | string;
  suspension_reason?: string;
  created_at?: string;
  updated_at?: string;
  expiry_date?: string;
  days_remaining?: number;
  owner?: UserVm;
}

export interface ProductDto {
  id_product: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationDto {
  id_notification: string;
  text: string;
  id_user: string;
  recipient_id?: string | null;
  created_at: string;
  updated_at: string;
  user?: UserVm;
}

export interface StatusProbeDto {
  status: string;
  reachability?: string;
  [key: string]: any;
}
