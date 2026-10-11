import { inject } from '@angular/core';
import { CanMatchFn, Route, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Protège une route par permission backend : `data: { permissions: ['user:manage'] }`
 * (au moins une requise). Sans session : écran de connexion. Permissions non chargées :
 * GET /api/auth/me d'abord. Refus : retour au tableau de bord (route sans permission requise,
 * donc sans boucle de redirection).
 *
 * Confort d'interface uniquement : le backend refuse de toute façon (403) un appel non autorisé.
 */
export const permissionGuard: CanMatchFn = (route: Route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const required = (route.data?.['permissions'] as readonly string[] | undefined) ?? [];
  if (required.length === 0) return true;
  if (!auth.isAuthenticated()) return router.parseUrl('/login');

  return auth.ensureCurrentUser().pipe(
    map((user) => {
      if (!user) return router.parseUrl('/login');
      return auth.hasAnyPermission(required) ? true : router.parseUrl('/dashboard');
    })
  );
};
