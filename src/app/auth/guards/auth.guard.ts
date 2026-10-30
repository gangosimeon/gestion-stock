import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { RETURN_URL_PARAM, safeReturnUrl } from '../return-url';

/** Sans session : écran de connexion, avec l'URL demandée comme URL de retour (chemin interne seulement). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  const returnUrl = safeReturnUrl(state.url);
  return router.createUrlTree(['/login'], { queryParams: { [RETURN_URL_PARAM]: returnUrl } });
};
