import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Customer } from '../models/customer.model';
import { CustomerPayment } from '../models/customer-payment.model';
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

export type CreateCustomerRequest = Omit<Customer, 'id'>;
export type UpdateCustomerRequest = Omit<Customer, 'id'>;

export interface CreateCustomerPaymentRequest {
  amount: number;
  paymentDateIso: string;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomersApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResult<Customer>> {
    return this.http
      .get<PaginatedResult<Customer>>(`${environment.apiUrl}/customers`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  getById(id: string): Observable<Customer> {
    return this.http
      .get<Customer>(`${environment.apiUrl}/customers/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateCustomerRequest): Observable<Customer> {
    return this.http
      .post<Customer>(`${environment.apiUrl}/customers`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  update(id: string, payload: UpdateCustomerRequest): Observable<Customer> {
    return this.http
      .patch<Customer>(`${environment.apiUrl}/customers/${id}`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  delete(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/customers/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  salesHistory(customerId: string): Observable<PaginatedResult<Sale>> {
    return this.http
      .get<PaginatedResult<Sale>>(`${environment.apiUrl}/customers/${customerId}/sales`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  payments(customerId: string): Observable<PaginatedResult<CustomerPayment>> {
    return this.http
      .get<PaginatedResult<CustomerPayment>>(`${environment.apiUrl}/customers/${customerId}/payments`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createPayment(customerId: string, payload: CreateCustomerPaymentRequest): Observable<CustomerPayment> {
    return this.http
      .post<CustomerPayment>(`${environment.apiUrl}/customers/${customerId}/payments`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
