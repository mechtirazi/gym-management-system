export interface GymMember {
  id?: string;
  userId?: string;
  id_user?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  avatar?: string;
  joinedAt?: string;
  id_gym?: string | number;
  enrollment_start?: string;
  enrollment_end?: string;
  [key: string]: any;
}
