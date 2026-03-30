export interface NutritionPlan {
  id_plan: string;
  id_gym?: string;
  goal: string;
  start_date: string;
  end_date: string;
  id_nutritionist: string;
  id_members?: string[];
  price: number;
  nutritionist?: {
    id_user: string;
    name: string;
    last_name: string;
  };
  members?: Array<{
    id_user: string;
    name: string;
    last_name: string;
  }>;
  created_at?: string;
  updated_at?: string;
}
