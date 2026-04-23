import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let gymId: string | number | null = null;

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
