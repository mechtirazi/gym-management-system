export interface EventModel {
  id_event: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  id_gym: string;
  reward_amount?: number;
  is_rewarded?: boolean;
  image_url?: string;
  image?: File;
  gym?: {
    name: string;
  };
  created_at?: string;
}
