import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/guards/auth.guard';

export const nutritionistRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['nutritionist'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/nutritionist-dashboard.component').then(
            m => m.NutritionistDashboardComponent
          )
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./clients/clients.component').then(m => m.NutritionistClientsComponent)
      },
      {
        path: 'nutrition-plans',
        loadComponent: () =>
          import('./nutrition-plans/nutrition-plans.component').then(
            m => m.NutritionistNutritionPlansComponent
          )
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

