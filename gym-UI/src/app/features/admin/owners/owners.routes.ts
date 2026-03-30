import { Routes } from '@angular/router';

export const OWNER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./owners-list/owners-list.component').then(c => c.OwnersListComponent)
  }
];
