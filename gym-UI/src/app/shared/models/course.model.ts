export interface Course {
  id_course: string;
  name: string;
  description: string;
  id_gym: string;
  price: number;
  max_capacity: number;
  count: number;
  duration: string;
  gym?: {
    name: string;
  };
  sessions?: any[];
  image_url?: string;
  image?: File;
  created_at?: string;
  updated_at?: string;
}
