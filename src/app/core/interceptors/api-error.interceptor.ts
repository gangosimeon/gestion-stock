import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

function toMessage(err: HttpErrorResponse): string {
  const bodyMsg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);

  if (bodyMsg) return bodyMsg;
  if (err.status === 0) return 'Impossible de joindre le serveur.';
  if (err.status === 401) return 'Session expirée. Veuillez vous reconnecter.';
  if (err.status === 403) return "Accès refusé.";
  return err.message || 'Une erreur est survenue.';
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((e: unknown) => {
      if (e instanceof HttpErrorResponse) {
        snackBar.open(toMessage(e), 'OK', { duration: 4500 });
      }

      return throwError(() => e);
    })
  );
};
