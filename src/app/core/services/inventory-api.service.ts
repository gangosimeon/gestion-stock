import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InventorySession, InventoryStatus } from '../models/inventory.model';
import { PageRequest, dayEndIso, dayStartIso, pageParams } from './page-params';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

export interface CreateInventorySessionLineInput {
  productId: string;
  physicalQuantity: number;
}

export interface CreateInventorySessionRequest {
  note?: string;
  lines: CreateInventorySessionLineInput[];
}

@Injectable({
  providedIn: 'root'
})
export class InventoryApiService {
  private readonly http = inject(HttpClient);

  /** Page de l'historique : recherche (n°), statut, période de création (jours inclus) et tri côté serveur. */
  listSessionsPage(
    page: PageRequest,
    filters: { status?: InventoryStatus | null; from?: string | null; to?: string | null } = {}
  ): Observable<PaginatedResult<InventorySession>> {
    const params = pageParams(page, { status: filters.status, from: dayStartIso(filters.from), to: dayEndIso(filters.to) });
    return this.http
      .get<PaginatedResult<InventorySession>>(`${environment.apiUrl}/inventory/sessions`, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  listSessions(): Observable<PaginatedResult<InventorySession>> {
    return this.http
      .get<PaginatedResult<InventorySession>>(`${environment.apiUrl}/inventory/sessions`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  getSessionById(id: string): Observable<InventorySession> {
    return this.http
      .get<InventorySession>(`${environment.apiUrl}/inventory/sessions/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createSession(payload: CreateInventorySessionRequest): Observable<InventorySession> {
    return this.http
      .post<InventorySession>(`${environment.apiUrl}/inventory/sessions`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
