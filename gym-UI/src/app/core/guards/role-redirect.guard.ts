import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * A guard to intelligently redirect users to their role-specific landing page.
 * Keeps routing logic clean and prevents hardcoded redirects across the app.
 */
export const roleRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.userRole();

  if (role === 'owner') {
    return router.parseUrl('/owner/dashboard');
  } else if (role === 'member') {
    return router.parseUrl('/member/dashboard');
  } else if (role === 'nutritionist') {
    return router.parseUrl('/nutritionist/dashboard');
  } else if (role === 'trainer') {
    return router.parseUrl('/trainer/dashboard');
  } else if (role === 'admin' || role === 'super_admin') {
    return router.parseUrl('/admin/dashboard');
  }

  // Fallback to login if no recognized role or the user is not logged in
  return router.parseUrl('/auth/login');
};
