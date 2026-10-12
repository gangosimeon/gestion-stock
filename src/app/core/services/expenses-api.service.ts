import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Expense, ExpenseCategory, ExpenseFilter, ExpensePaymentMethod, ExpenseSummary } from '../models/expense.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

/** Nouvelle dépense : le dépôt est le dépôt courant (en-tête X-Warehouse-Id). */
export interface CreateExpenseRequest {
  category: ExpenseCategory;
  label: string;
  amount: number;
  expenseDateIso: string;
  paymentMethod: ExpensePaymentMethod;
  externalReference?: string;
  note?: string;
}

function filterParams(filter: ExpenseFilter | undefined, params = new HttpParams()): HttpParams {
  if (filter?.dateFrom) params = params.set('dateFrom', filter.dateFrom);
  if (filter?.dateTo) params = params.set('dateTo', filter.dateTo);
  if (filter?.category) params = params.set('category', filter.category);
  if (filter?.paymentMethod) params = params.set('paymentMethod', filter.paymentMethod);
  if (filter?.status) params = params.set('status', filter.status);
  if (filter?.search) params = params.set('search', filter.search);
  return params;
}

@Injectable({
  providedIn: 'root'
})
export class ExpensesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/expenses`;

  /** Dépenses du dépôt courant, les plus récentes d'abord (annulées comprises). */
  list(filter?: ExpenseFilter, page = 0, size = 25): Observable<PaginatedResult<Expense>> {
    const params = filterParams(filter, new HttpParams().set('page', page).set('size', size));
    return this.http
      .get<PaginatedResult<Expense>>(this.baseUrl, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Totaux des dépenses payées sur les mêmes critères (le statut est ignoré). */
  summary(filter?: ExpenseFilter): Observable<ExpenseSummary> {
    return this.http
      .get<ExpenseSummary>(`${this.baseUrl}/summary`, { params: filterParams({ ...filter, status: undefined }) })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateExpenseRequest): Observable<Expense> {
    return this.http
      .post<Expense>(this.baseUrl, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Annulation motivée : la dépense reste visible, hors totaux ; en espèces, l'argent revient en caisse. */
  cancel(id: string, reason: string): Observable<Expense> {
    return this.http
      .post<Expense>(`${this.baseUrl}/${id}/cancel`, { reason })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
