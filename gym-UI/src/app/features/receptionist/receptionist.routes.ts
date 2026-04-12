import { Routes } from '@angular/router';

export const receptionistRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./views/dashboard/receptionist-dashboard.component').then(m => m.ReceptionistDashboardComponent)
      },
      {
        path: 'members',
        loadComponent: () =>
          import('../owner/member/member.component').then(m => m.MemberManagementComponent)
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./views/payments/receptionist-payments.component').then(m => m.ReceptionistPaymentsComponent)
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./views/attendance/receptionist-attendance.component').then(m => m.ReceptionistAttendanceComponent)
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('../owner/courses/courses.component').then(m => m.CourseManagementComponent)
      },
      {
        path: 'events',
        loadComponent: () =>
          import('../owner/events/events.component').then(m => m.EventManagementComponent)
      },
      {
        path: 'products',
        loadComponent: () =>
          import('../owner/products/products.component').then(m => m.ProductManagementComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

