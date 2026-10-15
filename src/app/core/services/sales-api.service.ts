import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateCustomerReturnRequest, CustomerReturn } from '../models/customer-return.model';
import { Customer } from '../models/customer.model';
import { PaymentMethod, Sale, SaleStatus, SaleType } from '../models/sale.model';
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

/** Critères de l'historique des ventes (GET /api/sales). Dates : jours AAAA-MM-JJ inclus. */
export interface SaleSearchFilters {
  status?: SaleStatus | null;
  paymentMethod?: PaymentMethod | null;
  from?: string | null;
  to?: string | null;
  /** Tous les dépôts au lieu du dépôt courant (permission warehouse:all). */
  allWarehouses?: boolean | null;
}

@Injectable({
  providedIn: 'root'
})
export class SalesApiService {
  private readonly http = inject(HttpClient);

  /** Historique : recherche (n°, client), filtres, tri et pagination côté serveur. */
  salesPage(page: PageRequest, filters: SaleSearchFilters = {}): Observable<PaginatedResult<Sale>> {
    const params = pageParams(page, {
      status: filters.status,
      paymentMethod: filters.paymentMethod,
      from: dayStartIso(filters.from),
      to: dayEndIso(filters.to),
      allWarehouses: filters.allWarehouses ? true : null
    });
    return this.http
      .get<PaginatedResult<Sale>>(`${environment.apiUrl}/sales`, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  get(id: string): Observable<Sale> {
    return this.http
      .get<Sale>(`${environment.apiUrl}/sales/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Retours déjà enregistrés sur une vente, du plus ancien au plus récent. */
  returnsForSale(saleId: string): Observable<CustomerReturn[]> {
    return this.http
      .get<CustomerReturn[]>(`${environment.apiUrl}/sales/${saleId}/returns`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Retour client (return:create) : montants calculés par le serveur au prix net de la vente. */
  createReturn(saleId: string, payload: CreateCustomerReturnRequest): Observable<CustomerReturn> {
    return this.http
      .post<CustomerReturn>(`${environment.apiUrl}/sales/${saleId}/returns`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Annulation (sale:cancel) : remise en stock, remboursement depuis la caisse ouverte, créance annulée. */
  cancel(id: string, reason: string): Observable<Sale> {
    return this.http
      .post<Sale>(`${environment.apiUrl}/sales/${id}/cancel`, { reason })
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
