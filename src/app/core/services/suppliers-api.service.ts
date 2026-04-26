import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Supplier } from '../models/supplier.model';
import { SupplierPurchaseHistory } from '../models/supplier-purchase-history.model';
import { SupplierPayment } from '../models/supplier-payment.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

export interface CreateSupplierRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  deliveryLeadTimeDays: number;
}

export interface UpdateSupplierRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  deliveryLeadTimeDays: number;
}

export interface CreateSupplierPaymentRequest {
  amount: number;
  paymentDateIso: string;
  orderId?: string;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SuppliersApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResult<Supplier>> {
    return this.http
      .get<PaginatedResult<Supplier>>(`${environment.apiUrl}/suppliers`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  getById(id: string): Observable<Supplier> {
    return this.http
      .get<Supplier>(`${environment.apiUrl}/suppliers/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateSupplierRequest): Observable<Supplier> {
    return this.http
      .post<Supplier>(`${environment.apiUrl}/suppliers`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  update(id: string, payload: UpdateSupplierRequest): Observable<Supplier> {
    return this.http
      .put<Supplier>(`${environment.apiUrl}/suppliers/${id}`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  delete(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/suppliers/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  purchaseHistory(supplierId: string): Observable<PaginatedResult<SupplierPurchaseHistory>> {
    return this.http
      .get<PaginatedResult<SupplierPurchaseHistory>>(`${environment.apiUrl}/suppliers/${supplierId}/purchases`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  payments(supplierId: string): Observable<PaginatedResult<SupplierPayment>> {
    return this.http
      .get<PaginatedResult<SupplierPayment>>(`${environment.apiUrl}/suppliers/${supplierId}/payments`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createPayment(supplierId: string, payload: CreateSupplierPaymentRequest): Observable<SupplierPayment> {
    return this.http
      .post<SupplierPayment>(`${environment.apiUrl}/suppliers/${supplierId}/payments`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
