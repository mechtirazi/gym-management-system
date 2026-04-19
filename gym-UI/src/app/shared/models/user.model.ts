export interface User {
  id_user: string;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  role:
    | 'super_admin'
    | 'admin'
    | 'owner'
    | 'trainer'
    | 'nutritionist'
    | 'receptionist'
    | 'staff'
    | 'member';
  gym_id?: string;
  gym_status?: 'active' | 'suspended';
  gym_suspension_reason?: string;
  profile_picture?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    access_token: string;
    token_type: string;
    user: User;
  };
}
