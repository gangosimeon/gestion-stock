import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

const PUBLIC_URLS = ['/auth/login', '/auth/forgot-password'];

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
      if (err instanceof HttpErrorResponse && err.status === 401) {
        return auth.refreshToken().pipe(
          switchMap((res) => next(addBearer(req, res.accessToken))),
          catchError((refreshErr) => {
            auth.logout();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
