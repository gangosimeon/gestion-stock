import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PlatformAuthService } from './platform-auth.service';

/** Espace Super Admin : session plateforme requise ; mot de passe initial changé avant toute autre page. */
export const platformGuard: CanActivateFn = () => {
  const auth = inject(PlatformAuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.parseUrl('/platform/login');
  if (auth.admin?.mustChangePassword) return router.parseUrl('/platform/change-password');
  return true;
};

/** Changement du mot de passe initial : session requise. */
export const platformSessionGuard: CanActivateFn = () => {
  const auth = inject(PlatformAuthService);
  return auth.isAuthenticated() ? true : inject(Router).parseUrl('/platform/login');
};
