export interface EventModel {
  id_event: string;
  title: string;
  description: string;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  max_participants: number;
  price: number;
  id_gym: string;
  reward_amount?: number;
  is_rewarded?: boolean;
  max_winners?: number;
  image_url?: string;
  image?: File;
  gym?: {
    name: string;
  };
  created_at?: string;
  attendances_count?: number;
}
