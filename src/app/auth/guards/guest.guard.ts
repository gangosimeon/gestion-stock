import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { RETURN_URL_PARAM, safeReturnUrl } from '../return-url';

/** Déjà connecté : l'URL de retour demandée (chemin interne seulement), sinon le tableau de bord. */
export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.parseUrl(safeReturnUrl(route.queryParamMap.get(RETURN_URL_PARAM))) : true;
};
