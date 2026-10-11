import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Supplier, SupplierAccount } from '../models/supplier.model';
import { SupplierPurchaseHistory } from '../models/supplier-purchase-history.model';
import { SupplierPayment, SupplierPaymentMethod } from '../models/supplier-payment.model';
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

/**
 * POST /api/suppliers/{id}/payments. Sans `orderId`, le backend solde les commandes les plus
 * anciennes ; il refuse tout montant supérieur au reste dû. En espèces, le paiement sort de la
 * caisse ouverte de l'utilisateur.
 */
export interface CreateSupplierPaymentRequest {
  amount: number;
  paymentDateIso: string;
  paymentMethod?: SupplierPaymentMethod;
  orderId?: string;
  externalReference?: string;
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

  /** PUT : les champs inconnus du formulaire (code, contact, NCC…) sont conservés par le backend. */
  update(id: string, payload: UpdateSupplierRequest): Observable<Supplier> {
    return this.http
      .put<Supplier>(`${environment.apiUrl}/suppliers/${id}`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Côté backend, « supprimer » désactive le fournisseur : commandes et produits le référencent. */
  delete(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/suppliers/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /**
   * Réceptions du fournisseur. Sans `allWarehouses`, le backend se limite au dépôt courant ;
   * `allWarehouses` exige la permission warehouse:all.
   */
  purchaseHistory(
    supplierId: string,
    allWarehouses = false
  ): Observable<PaginatedResult<SupplierPurchaseHistory>> {
    const params = allWarehouses ? new HttpParams().set('allWarehouses', 'true') : undefined;
    return this.http
      .get<PaginatedResult<SupplierPurchaseHistory>>(`${environment.apiUrl}/suppliers/${supplierId}/purchases`, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  payments(supplierId: string): Observable<PaginatedResult<SupplierPayment>> {
    return this.http
      .get<PaginatedResult<SupplierPayment>>(`${environment.apiUrl}/suppliers/${supplierId}/payments`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Commandé, reçu, dû, payé et reste à payer, calculés par le backend. */
  account(supplierId: string): Observable<SupplierAccount> {
    return this.http
      .get<SupplierAccount>(`${environment.apiUrl}/suppliers/${supplierId}/account`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createPayment(
    supplierId: string,
    payload: CreateSupplierPaymentRequest
  ): Observable<SupplierPayment> {
    return this.http
      .post<SupplierPayment>(`${environment.apiUrl}/suppliers/${supplierId}/payments`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
