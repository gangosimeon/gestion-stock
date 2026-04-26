import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Customer } from '../models/customer.model';
import { Sale } from '../models/sale.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

export type CreateSaleRequest = Omit<Sale, 'id' | 'createdAt' | 'createdByUserId' | 'total' | 'profit'>;

@Injectable({
  providedIn: 'root'
})
export class SalesApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResult<Sale>> {
    return this.http
      .get<PaginatedResult<Sale>>(`${environment.apiUrl}/sales`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateSaleRequest): Observable<Sale> {
    return this.http
      .post<Sale>(`${environment.apiUrl}/sales`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  listCustomers(): Observable<PaginatedResult<Customer>> {
    return this.http
      .get<PaginatedResult<Customer>>(`${environment.apiUrl}/customers`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createCustomer(payload: Omit<Customer, 'id'>): Observable<Customer> {
    return this.http
      .post<Customer>(`${environment.apiUrl}/customers`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
