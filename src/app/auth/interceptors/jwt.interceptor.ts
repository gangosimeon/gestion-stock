import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

// Pas de jeton sur ces appels ; /auth/refresh évite aussi une boucle de renouvellement sur 401.
const PUBLIC_URLS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password'];

function addBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isPublic = PUBLIC_URLS.some((u) => req.url.includes(u));
  if (isPublic) return next(req);

  const token = auth.accessToken;
  const outgoing = token ? addBearer(req, token) : req;

  return next(outgoing).pipe(
    catchError((err) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !token) {
        return throwError(() => err);
      }
      // Jeton déjà renouvelé par une requête concurrente : on rejoue sans nouveau refresh.
      const current = auth.accessToken;
      if (current && current !== token) return next(addBearer(req, current));
      // Un refresh refusé ferme lui-même la session (AuthService.refreshToken).
      return auth.refreshToken().pipe(switchMap((res) => next(addBearer(req, res.accessToken))));
    })
  );
};
