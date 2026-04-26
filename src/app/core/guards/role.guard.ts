import { CanMatchFn, Route, Router, UrlSegment } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const roleGuard: CanMatchFn = (route: Route, _segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roles = (route.data?.['roles'] as string[] | undefined) ?? [];
  if (roles.length === 0) return true;

  return auth.hasAnyRole(roles).pipe(map((ok) => (ok ? true : router.parseUrl('/'))));
};
