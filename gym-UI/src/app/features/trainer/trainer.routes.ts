import { Routes } from '@angular/router';

export const trainerRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/trainer-dashboard.component').then(m => m.TrainerDashboardComponent)
  },
  {
    path: 'sessions',
    loadComponent: () => import('./sessions/trainer-sessions.component').then(m => m.TrainerSessionsComponent)
  },
  {
    path: 'analytics',
    loadComponent: () => import('./analytics/trainer-analytics.component').then(m => m.TrainerAnalyticsComponent)
  },
  {
    path: 'members',
    loadComponent: () => import('./members/trainer-members.component').then(m => m.TrainerMembersComponent)
  },
  {
    path: 'courses',
    loadComponent: () => import('./courses/trainer-courses.component').then(m => m.TrainerCoursesComponent)
  },
  {
    path: 'nutrition',
    loadComponent: () => import('./nutrition/trainer-nutrition.component').then(m => m.TrainerNutritionComponent)
  },
  {
    path: 'community',
    loadComponent: () => import('./community/trainer-community.component').then(m => m.TrainerCommunityComponent)
  },
  {
    path: 'calendar',
    loadComponent: () => import('./calendar/trainer-calendar.component').then(m => m.TrainerCalendarComponent)
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];
