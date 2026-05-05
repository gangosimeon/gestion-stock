import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuditLogEntry, AuditLogFilter, AuditLogStats } from '../models/audit-log.model';
import { PaginatedResult } from './products-api.service';

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
export class AuditLogsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/audit-logs`;

  /** Liste paginée et filtrée des logs */
  list(filters?: AuditLogFilter, page = 0, size = 25): Observable<PaginatedResult<AuditLogEntry>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters?.actions?.length) params = params.set('actions', filters.actions.join(','));
    if (filters?.entityTypes?.length) params = params.set('entityTypes', filters.entityTypes.join(','));
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);

    return this.http
      .get<PaginatedResult<AuditLogEntry>>(this.baseUrl, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Détail d'un log par son ID */
  getById(id: string): Observable<AuditLogEntry> {
    return this.http
      .get<AuditLogEntry>(`${this.baseUrl}/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Statistiques globales */
  getStats(): Observable<AuditLogStats> {
    return this.http
      .get<AuditLogStats>(`${this.baseUrl}/stats`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Export CSV (retourne un Blob) */
  exportCsv(filters?: AuditLogFilter): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters?.actions?.length) params = params.set('actions', filters.actions.join(','));
    if (filters?.entityTypes?.length) params = params.set('entityTypes', filters.entityTypes.join(','));
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (filters?.status) params = params.set('status', filters.status);

    return this.http
      .get(`${this.baseUrl}/export`, { params, responseType: 'blob' })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
