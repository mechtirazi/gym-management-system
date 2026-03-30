import { User } from './user.model';
import { EventModel } from './event.model';

export interface Review {
  review_id: string;
  id_user: string;
  id_event: string;
  rating: number; // 1-5
  comment: string;
  review_date: string;
  ai_sentiment_score?: number; // 0.0 to 1.0 (0.0 = very negative, 1.0 = positive)
  ai_category?: string; // 'positive', 'neutral', 'negative'
  user?: User;
  event?: EventModel;
  created_at?: string;
}

export interface ReviewsResponse {
  success: boolean;
  message: string;
  data: Review[];
}
