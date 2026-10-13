import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SupplierPaymentMethod } from '../models/supplier-payment.model';
import { PurchaseOrder, PurchaseOrderDocumentStatus, SupplierInvoice } from '../models/purchase-order.model';
import { PageRequest, pageParams } from './page-params';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

export interface CreatePurchaseOrderRequest {
  supplierId: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitPurchasePrice: number;
  }>;
}

/** Corps vide : tout le reste à recevoir entre en stock (dépôt de la commande). */
export interface ReceivePurchaseOrderRequest {
  deliveredAtIso?: string;
}

/** Commande reçue ou soldée, une seule facture ; montant = valeur reçue (backend). */
export interface CreateSupplierInvoiceRequest {
  invoiceNumber: string;
  invoiceDateIso: string;
}

/** Même règle que le paiement d'un fournisseur ; plafond = reste à payer de la commande. */
export interface PayPurchaseOrderRequest {
  amount: number;
  paymentDateIso: string;
  paymentMethod?: SupplierPaymentMethod;
  externalReference?: string;
  note?: string;
}

/** Critères de la liste des commandes (GET /api/purchases/orders). */
export interface PurchaseOrderSearchFilters {
  status?: PurchaseOrderDocumentStatus | null;
  supplierId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PurchasesApiService {
  private readonly http = inject(HttpClient);

  /** Page de commandes : recherche (n°, fournisseur), statut, fournisseur et tri côté serveur. */
  findOrdersPage(page: PageRequest, filters: PurchaseOrderSearchFilters = {}): Observable<PaginatedResult<PurchaseOrder>> {
    return this.http
      .get<PaginatedResult<PurchaseOrder>>(`${environment.apiUrl}/purchases/orders`, { params: pageParams(page, { ...filters }) })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  listOrders(): Observable<PaginatedResult<PurchaseOrder>> {
    return this.http
      .get<PaginatedResult<PurchaseOrder>>(`${environment.apiUrl}/purchases/orders`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  getOrderById(id: string): Observable<PurchaseOrder> {
    return this.http
      .get<PurchaseOrder>(`${environment.apiUrl}/purchases/orders/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createOrder(payload: CreatePurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.http
      .post<PurchaseOrder>(`${environment.apiUrl}/purchases/orders`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  receiveOrder(orderId: string, payload: ReceivePurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.http
      .post<PurchaseOrder>(`${environment.apiUrl}/purchases/orders/${orderId}/receive`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createInvoice(orderId: string, payload: CreateSupplierInvoiceRequest): Observable<SupplierInvoice> {
    return this.http
      .post<SupplierInvoice>(`${environment.apiUrl}/purchases/orders/${orderId}/invoice`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  payOrder(orderId: string, payload: PayPurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.http
      .post<PurchaseOrder>(`${environment.apiUrl}/purchases/orders/${orderId}/pay`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
