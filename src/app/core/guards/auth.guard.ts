import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Requires an authenticated user with a valid profile. */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (authService.isAuthenticated && authService.profile()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/** Requires the admin role. Colaboradores are redirected to their home. */
export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (!authService.isAuthenticated || !authService.profile()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate([authService.homeRoute()]);
  return false;
};
