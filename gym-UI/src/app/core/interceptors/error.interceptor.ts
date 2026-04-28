import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 403 Forbidden is returned by CheckGymStatus middleware when a gym is suspended
      if (error.status === 403) {
        const errorData = error.error;
        const message = errorData?.message || '';
        
        // Check if the error message specifically mentions suspension
        if (message.toLowerCase().includes('suspended')) {
          const user = authService.currentUser();
          
          // Only update if we aren't already marked as suspended in the local state
          if (user && user.gym_status !== 'suspended') {
            authService.updateCurrentUser({
              ...user,
              gym_status: 'suspended',
              gym_suspension_reason: errorData?.reason || 'Access to this gym has been suspended by the platform administration.'
            });
          }
        }
      }
      
      // Also handle 401 Unauthorized by logging out (session expired)
      if (error.status === 401) {
        authService.logout();
      }

      return throwError(() => error);
    })
  );
};
