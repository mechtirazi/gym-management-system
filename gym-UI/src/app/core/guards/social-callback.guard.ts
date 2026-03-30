import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const socialCallbackGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  if (authService.handleSocialLogin(route.queryParams)) {
    router.navigate(['/dashboard'], { replaceUrl: true });
    return false;
  }

  return true; // Fallback to the component if params are missing or invalid
};
