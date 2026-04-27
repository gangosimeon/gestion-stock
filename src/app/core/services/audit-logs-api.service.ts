import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuditLogEntry } from '../models/audit-log.model';
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

  list(): Observable<PaginatedResult<AuditLogEntry>> {
    return this.http
      .get<PaginatedResult<AuditLogEntry>>(`${environment.apiUrl}/audit-logs`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
