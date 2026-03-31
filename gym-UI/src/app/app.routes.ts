import { Routes } from '@angular/router';
import { socialCallbackGuard } from './core/guards/social-callback.guard';
import { roleRedirectGuard } from './core/guards/role-redirect.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'callback',
        canActivate: [socialCallbackGuard],
        loadComponent: () => import('./features/auth/social-callback/social-callback').then(m => m.SocialCallback)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  // The Smart Redirecting Root Route for dashboards
  {
    path: 'dashboard',
    canActivate: [roleRedirectGuard],
    // The component won't actually render if the guard redirects immediately,
    // but Angular requires a valid layout mapping.
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  // The Main Authenticated App wrapper for segregated feature domains
  {
    path: '',
    loadComponent: () => import('./shared/layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    // canActivate: [authGuard],
    children: [
      { 
        path: 'settings', 
        loadComponent: () => import('./features/shared/settings/settings.component').then(m => m.SettingsComponent) 
      },
      {
        path: 'owner',
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/owner/dashboard/owner-dashboard.component').then(m => m.OwnerDashboardComponent) },
          { path: 'gym-profile', loadComponent: () => import('./features/owner/gym-profile/gym-profile').then(m => m.GymProfileComponent) },
          { path: 'trainers', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'members', loadComponent: () => import('./features/owner/member/member.component').then(m => m.MemberManagementComponent) },
          { path: 'memberships', loadComponent: () => import('./features/owner/membership/membership.component').then(m => m.MembershipManagementComponent) },
          { path: 'revenue', loadComponent: () => import('./features/owner/revenue/revenue.component').then(m => m.OwnerRevenueComponent) },
          { path: 'attendance', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'courses', loadComponent: () => import('./features/owner/courses/courses.component').then(m => m.CourseManagementComponent) },
          { path: 'events', loadComponent: () => import('./features/owner/events/events.component').then(m => m.EventManagementComponent) },
          { path: 'staff', loadComponent: () => import('./features/owner/staff/staff.component').then(m => m.StaffManagementComponent) },
          { path: 'equipment', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'products', loadComponent: () => import('./features/owner/products/products.component').then(m => m.ProductManagementComponent) },
          { path: 'subscriptions', loadComponent: () => import('./features/owner/subscriptions/subscriptions.component').then(m => m.SubscriptionManagementComponent) },
          { path: 'community', loadComponent: () => import('./features/owner/community/community.component').then(m => m.CommunityComponent) },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'nutrition', loadComponent: () => import('./features/owner/nutrition/nutrition.component').then(m => m.NutritionManagementComponent) },
        ]
      },
      {
        path: 'nutritionist',
        loadChildren: () => import('./features/nutritionist/nutritionist.routes').then(m => m.nutritionistRoutes)
      },
      {
        path: 'admin',
        children: [
          { 
            path: 'dashboard', 
            loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) 
          },
          { 
            path: 'owners', 
            loadComponent: () => import('./features/admin/owners/owners-list/owners-list.component').then(m => m.OwnersListComponent) 
          },
          { 
            path: 'gyms', 
            loadComponent: () => import('./features/admin/gyms/gyms-list.component').then(m => m.GymsListComponent) 
          },
          { 
            path: 'monitoring', 
            loadComponent: () => import('./features/admin/monitoring/monitoring.component').then(m => m.MonitoringComponent) 
          },
          { 
            path: 'access-matrix', 
            loadComponent: () => import('./features/admin/access-matrix/access-matrix.component').then(m => m.AccessMatrixComponent) 
          },
          { 
            path: 'activity', 
            loadComponent: () => import('./features/admin/activity/activity.component').then(m => m.ActivityComponent) 
          },
          { 
            path: 'operations', 
            loadComponent: () => import('./features/admin/operations/operations.component').then(m => m.OperationsComponent) 
          },
          { 
            path: 'revenue', 
            loadComponent: () => import('./features/admin/dashboard/components/revenue-analytics/revenue-analytics.component').then(m => m.RevenueAnalyticsComponent) 
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      {
        path: 'member',
        children: [
          { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      }
    ]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' }
];
