export interface RevenueData {
  month: string;
  amount: number;
}

export interface RevenueSource {
  type: string;
  amount: number;
  percentage: number;
}

export interface RevenueMethod {
  method: string;
  amount: number;
  percentage: number;
}

export interface GrowthStats {
  momGrowth: number;
  ytdRevenue: number;
  averageMonthly: number;
  forecast: number;
  arpu: number;
}

export interface EnrollmentStats {
  active: number;
  total: number;
  rate: number;
  newThisMonth: number;
  expiringSoon: number;
  activeEvents: number;
}

export interface TopProduct {
  name: string;
  price: number;
  category: string;
  total_sold: number;
  total_revenue: number;
}

export interface TopCourse {
  id_course: string;
  revenue: number;
  enrollments: number;
  course: {
    name: string;
  };
}

export interface TopEvent {
  title: string;
  participants: number;
}

export interface AdvancedRevenueStats {
  totalRevenue: number;
  chartData: RevenueData[];
  memberGrowth: any[];
  sources: RevenueSource[];
  methods: RevenueMethod[];
  topProducts?: TopProduct[];
  topCourses?: TopCourse[];
  topEvents?: TopEvent[];
  enrollmentStats?: EnrollmentStats;
  growth: GrowthStats;
}
