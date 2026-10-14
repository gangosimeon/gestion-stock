import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Customer } from '../models/customer.model';
import { PaymentMethod, Sale, SaleType } from '../models/sale.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

/** Article vendu : produit, quantité, remise éventuelle. Le backend fixe le prix. */
export interface CreateSaleItem {
  productId: string;
  quantity: number;
  discountPercent?: number;
}

/**
 * POST /api/sales. Aucun prix ni coût : le backend applique le tarif (`type`), vérifie le
 * stock et le crédit, encaisse dans la caisse ouverte. `paidAmount` absent : totalité payée.
 */
export interface CreateSaleRequest {
  type: SaleType;
  customerId?: string;
  /** Client absent de la base : créé (ou retrouvé par nom + téléphone) avec la vente, côté serveur. */
  newCustomer?: { name: string; phone?: string };
  paymentMethod: PaymentMethod;
  paidAmount?: number;
  note?: string;
  items: CreateSaleItem[];
}

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

  updateCustomer(id: string, payload: Omit<Customer, 'id'>): Observable<Customer> {
    return this.http
      .patch<Customer>(`${environment.apiUrl}/customers/${id}`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  deleteCustomer(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/customers/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
