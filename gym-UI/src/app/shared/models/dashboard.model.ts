export interface DashboardStats {
  // Owner stats
  totalRevenue: number;
  revenueTrend: number;
  activeMembers: number;
  membersTrend: number;
  newMemberships: number;
  membershipsTrend: number;
  activeTrainers: number;
  trainersTrend: number;
  pendingMemberships?: number;
  expiredMemberships?: number;

  // Member stats
  totalAttendance?: number;
  walletBalance?: number;
  activeSubscriptions?: number;
  enrollments?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  upcomingSessions: UpcomingSession[];
  inventoryAlerts: InventoryAlert[];
  expiringMemberships: ExpiringMembership[];
  activityTrends: ActivityTrend[];
  focusAreas: FocusArea[];
  staffSnapshot: StaffSnapshotMember[];
  topProducts: TopProduct[];
  topCourses: TopCourse[];
}

export interface ActivityTrend {
  date: string;
  attendance: number;
  signups: number;
  expired: number;
}

export interface FocusArea {
  label: string;
  value: number;
  color: string;
}

export interface UpcomingSession {
  id: string;
  courseName: string;
  startTime: string;
  trainer: string;
  status: string;
}

export interface InventoryAlert {
  name: string;
  stock: number;
  price: number | string;
}

export interface ExpiringMembership {
  memberName: string;
  expiryDate: string;
  daysLeft: number;
}

export interface StaffSnapshotMember {
  id_user: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  phone: string;
}

export interface Checkin {
  id: string;
  memberName: string;
  initials: string;
  timeAgo: string;
}

export interface RevenueData {
  month: string;
  amount: number;
}

export interface TopProduct {
  id_product?: string;
  name: string;
  total_sold: number;
  revenue: number;
  image?: string | null;
}

export interface TopCourse {
  id_course?: string;
  name: string;
  enrolled: number;
  capacity: number;
  occupancy: number;
  image?: string | null;
}
