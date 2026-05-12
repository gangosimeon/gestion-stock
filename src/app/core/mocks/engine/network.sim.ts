/**
 * network.sim.ts
 * Simulation réseau pour les mocks Angular.
 *
 * Expose :
 *  - withNetworkSim()  : opérateur RxJS (délai + injection d'erreur aléatoire)
 *  - withDelay()       : opérateur RxJS (délai seul, pour les erreurs attendues)
 *  - mockOk()          : crée un Observable HttpResponse<T> avec délai + erreur sim
 *  - mockErr()         : crée un Observable HttpErrorResponse avec délai seul
 */

import {
  Observable,
  of,
  throwError,
  timer,
} from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpResponse,
} from '@angular/common/http';
import {
  computeDelayMs,
  randomErrorStatus,
  shouldInjectError,
} from '../config/mock.config';

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyHttpEvent<T> = HttpEvent<T>;

// ─── Opérateurs RxJS ─────────────────────────────────────────────────────────

/**
 * Opérateur RxJS : ajoute un délai réseau simulé.
 * Pour les réponses d'erreur attendues (4xx) — pas d'injection d'erreur.
 */
export function withDelay<T>(ms?: number): (source: Observable<T>) => Observable<T> {
  return (source) => {
    const delay = ms ?? computeDelayMs();
    return timer(delay).pipe(switchMap(() => source));
  };
}

/**
 * Opérateur RxJS : ajoute délai + possibilité d'erreur injectée aléatoirement.
 * Pour les réponses de succès (2xx).
 */
export function withNetworkSim<T>(): (source: Observable<T>) => Observable<T> {
  return (source) => {
    return timer(computeDelayMs()).pipe(
      switchMap(() => {
        if (shouldInjectError()) {
          const status = randomErrorStatus();
          return throwError(
            () =>
              new HttpErrorResponse({
                status,
                error: {
                  message: `[MOCK] Erreur simulée (HTTP ${status})`,
                  code: `MOCK_SIMULATED_${status}`,
                },
              })
          );
        }
        return source;
      })
    );
  };
}

// ─── Helpers de réponse ───────────────────────────────────────────────────────

/**
 * Crée un Observable de succès HTTP avec délai + simulation d'erreur.
 * Utilisation : `return mockOk(data);`
 */
export function mockOk<T>(body: T, status = 200): Observable<AnyHttpEvent<T>> {
  return of(new HttpResponse<T>({ status, body })).pipe(withNetworkSim());
}

/**
 * Crée un Observable d'erreur HTTP avec délai seul (pas de double-erreur).
 * Utilisation : `return mockErr(401, 'Non authentifié.');`
 */
export function mockErr(status: number, message: string): Observable<never> {
  return timer(computeDelayMs()).pipe(
    switchMap(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status,
            error: { message },
          })
      )
    )
  );
}

/**
 * Variante de mockErr() avec un objet erreur personnalisé.
 */
export function mockErrDetail(
  status: number,
  error: Record<string, unknown>
): Observable<never> {
  return timer(computeDelayMs()).pipe(
    switchMap(() =>
      throwError(() => new HttpErrorResponse({ status, error }))
    )
  );
}

// ─── Timeout simulé ──────────────────────────────────────────────────────────

/**
 * Simule un timeout réseau (très long délai puis erreur 0).
 * Activé manuellement pour les tests de robustesse UI.
 */
export function mockTimeout(): Observable<never> {
  return timer(30_000).pipe(
    switchMap(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 0,
            error: { message: '[MOCK] Timeout réseau simulé' },
          })
      )
    )
  );
}
