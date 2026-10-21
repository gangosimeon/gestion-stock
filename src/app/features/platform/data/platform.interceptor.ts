import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { PlatformAuthService } from './platform-auth.service';

const PUBLIC_PLATFORM_URLS = ['/platform/auth/login', '/platform/auth/refresh', '/platform/auth/logout'];

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Jeton Super Admin sur les appels /api/platform/** uniquement (jamais sur les routes des entreprises) ;
 * sur 401, un seul renouvellement puis rejeu.
 */
export const platformInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/platform/') || PUBLIC_PLATFORM_URLS.some((u) => req.url.includes(u))) {
    return next(req);
  }
  const auth = inject(PlatformAuthService);
  const token = auth.accessToken;
  if (!token) return next(req);
  return next(withToken(req, token)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return auth.refresh().pipe(switchMap((res) => next(withToken(req, res.accessToken))));
    })
  );
};
