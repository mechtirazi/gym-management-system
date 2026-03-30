import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const gymId = authService.connectedGymId();

  let headers: any = {
    Authorization: `Bearer ${token}`
  };

  if (gymId) {
    headers['X-Gym-Id'] = gymId.toString();
  }

  if (token) {
    const cloned = req.clone({
      setHeaders: headers
    });
    return next(cloned);
  }

  return next(req);
};
