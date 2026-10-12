import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Dashboard, MyDay } from '../models/dashboard.model';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {
  private readonly http = inject(HttpClient);

  /** Indicateurs du jour, ventes 14 jours, top produits 30 jours, stock 7 jours (dépôt courant). */
  get(): Observable<Dashboard> {
    return this.http
      .get<Dashboard>(`${environment.apiUrl}/dashboard`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Mes ventes du jour (permission sale:create) : tableau de bord du caissier. */
  myDay(): Observable<MyDay> {
    return this.http
      .get<MyDay>(`${environment.apiUrl}/dashboard/me`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
