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
  occupancy: Occupancy;
}

export interface Occupancy {
  current: number;
  capacity: number;
  percentage: number;
  gymName: string;
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

