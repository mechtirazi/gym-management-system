export interface Session {
  id_session: string;
  id_course: string;
  date_session: string;
  start_time: string;
  end_time: string;
  status: string;
  attendances?: any[];
}

export interface Course {
  id_course: string;
  name: string;
  description: string;
  id_gym: string;
  price: number;
  max_capacity: number;
  count: number;
  duration: string;
  type?: string;
  gym?: {
    name: string;
  };
  sessions?: Session[];
  image_url?: string;
  image?: File;
  created_at?: string;
  updated_at?: string;
}
