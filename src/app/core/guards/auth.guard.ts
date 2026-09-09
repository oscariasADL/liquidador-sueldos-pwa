import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for initial auth check to complete
  if (authService.isLoading()) {
    return new Promise<boolean>((resolve) => {
      const interval = setInterval(() => {
        if (!authService.isLoading()) {
          clearInterval(interval);
          if (authService.isAuthenticated) {
            resolve(true);
          } else {
            router.navigate(['/login']);
            resolve(false);
          }
        }
      }, 50);
    });
  }

  if (authService.isAuthenticated) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
