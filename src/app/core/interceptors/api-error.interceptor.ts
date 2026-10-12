import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

/** Message affiché à l'utilisateur pour une erreur HTTP (exporté pour les tests). */
export function toMessage(err: HttpErrorResponse): string {
  const body = err.error as { message?: string; traceId?: string } | string | null;
  const bodyMsg = typeof body === 'string' ? body : body?.message;
  const traceId = typeof body === 'object' && body ? body.traceId : undefined;

  // Réseau coupé, serveur arrêté, CORS ou proxy : aucune réponse exploitable.
  if (err.status === 0) return 'Serveur injoignable : vérifiez votre connexion puis réessayez.';
  if (err.status === 401) return bodyMsg ?? 'Session expirée. Veuillez vous reconnecter.';
  if (err.status === 403) return bodyMsg ?? 'Accès refusé : vous n’avez pas la permission nécessaire.';
  // Proxy ou serveur en cours de redémarrage : la réponse n'est pas celle du backend.
  if (err.status === 502 || err.status === 503 || err.status === 504) {
    return 'Service momentanément indisponible. Réessayez dans quelques instants.';
  }
  if (err.status >= 500) {
    // La référence permet de retrouver l'erreur dans les journaux du serveur.
    const ref = traceId ? ` (référence : ${traceId})` : '';
    return (bodyMsg ?? 'Une erreur interne est survenue.') + ref;
  }
  return bodyMsg ?? (err.message || 'Une erreur est survenue.');
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
