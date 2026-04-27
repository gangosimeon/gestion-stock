import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Expense } from '../models/expense.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

export type CreateExpenseRequest = Omit<Expense, 'id' | 'createdAt' | 'createdByUserId'>;

@Injectable({
  providedIn: 'root'
})
export class ExpensesApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResult<Expense>> {
    return this.http
      .get<PaginatedResult<Expense>>(`${environment.apiUrl}/expenses`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateExpenseRequest): Observable<Expense> {
    return this.http
      .post<Expense>(`${environment.apiUrl}/expenses`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  delete(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/expenses/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
