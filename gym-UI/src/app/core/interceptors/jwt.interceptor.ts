import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let gymId: string | number | null = null;

  const isPublicAuthRequest =
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/verify-code') ||
    req.url.includes('/auth/reset-password') ||
    req.url.includes('/auth/resend-verification');

  // Public auth routes should not carry potentially stale bearer tokens.
  if (isPublicAuthRequest) {
    return next(req);
  }

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      gymId = user.gym_id;
    } catch (e) {
      // Standard cleanup if parsing fails, but don't block request
    }
  }

  const headers: any = {
    Authorization: `Bearer ${token}`
  };

  if (gymId && !req.headers.has('X-Gym-Id')) {
    headers['X-Gym-Id'] = gymId.toString();
  }

  if (token && token !== 'null' && token !== 'undefined') {
    const cloned = req.clone({
      setHeaders: headers
    });
    return next(cloned);
  }

  return next(req);
};
