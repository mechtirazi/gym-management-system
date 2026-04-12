import { Routes } from '@angular/router';

export const memberRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/member-dashboard.component').then(m => m.MemberDashboardComponent)
  },
  {
    path: 'workouts',
    loadComponent: () => import('./workouts/member-workouts.component').then(m => m.MemberWorkoutsComponent)
  },
  {
    path: 'nutrition',
    loadComponent: () => import('./nutrition/member-nutrition.component').then(m => m.MemberNutritionComponent)
  },
  {
    path: 'progress',
    loadComponent: () => import('./progress/member-progress.component').then(m => m.MemberProgressComponent)
  },
  {
    path: 'gyms',
    loadComponent: () => import('./gyms/member-gyms.component').then(m => m.MemberGymsComponent)
  },
  {
    path: 'gyms/:id',
    loadComponent: () => import('./gyms/member-gym-profile.component').then(m => m.MemberGymProfileComponent)
  },
  {
    path: 'courses',
    loadComponent: () => import('./courses/member-courses.component').then(m => m.MemberCoursesComponent)
  },
  {
    path: 'feed',
    loadComponent: () => import('./feed/feed').then(m => m.FeedComponent)
  },
  {
    path: 'subscriptions',
    loadComponent: () => import('./subscriptions/subscriptions').then(m => m.SubscriptionsComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('../shared/settings/settings.component').then(m => m.SettingsComponent)
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];
