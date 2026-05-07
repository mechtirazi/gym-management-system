export interface NutritionMeal {
  id_meal?: string;
  name: string;
  time: string;
  description?: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
  is_completed?: boolean;
}

export interface NutritionSupplement {
  id_supplement?: string;
  name: string;
  dosage: string;
  timing: string;
  type: 'capsule' | 'powder' | 'liquid';
}

export interface NutritionPlan {
  id_plan: string;
  id_gym?: string;
  name?: string;
  description?: string;
  image?: string;
  goal: string;
  start_date: string;
  end_date: string;
  id_nutritionist: string;
  id_members?: string[];
  price: number;
  
  // Metabolic Metrics
  protein?: number;
  carbs?: number;
  fats?: number;
  calories?: number;
  score?: number;
  is_active?: boolean;

  // Nested Data
  meals?: NutritionMeal[];
  supplements?: NutritionSupplement[];

  nutritionist?: {
    id_user: string;
    name: string;
    last_name: string;
    profile_picture?: string;
    role?: string;
  };
  members?: Array<{
    id_user: string;
    name: string;
    last_name: string;
    email?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface NutritionMessage {
  id?: string;
  id_sender: string;
  id_receiver: string;
  text: string;
  created_at: string;
  sender_name?: string;
}
