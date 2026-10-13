import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Customer } from '../models/customer.model';
import { CustomerPayment } from '../models/customer-payment.model';
import { PaymentMethod, Sale } from '../models/sale.model';
import { PageRequest, pageParams } from './page-params';
import { ActiveStatusFilter, PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

/**
 * Création et modification (PATCH) d'un client. En modification, `creditLimit` absent est
 * conservé par le backend ; le changer exige la permission customer:credit.
 */
/** Critères de la liste des clients (GET /api/customers). */
export interface CustomerSearchFilters {
  status?: ActiveStatusFilter | null;
  type?: 'INDIVIDUAL' | 'COMPANY' | null;
  priceCategory?: 'RETAIL' | 'WHOLESALE' | null;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  creditLimit?: number;
}
export type UpdateCustomerRequest = CreateCustomerRequest;

/**
 * Règlement d'une dette client : encaissé maintenant dans la caisse ouverte de l'utilisateur,
 * refusé au-delà de la dette (backend).
 */
export interface CreateCustomerPaymentRequest {
  amount: number;
  paymentMethod?: PaymentMethod;
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

  /** Page de clients : recherche (code, nom, email, téléphone), filtres et tri côté serveur. */
  findPage(page: PageRequest, filters: CustomerSearchFilters = {}): Observable<PaginatedResult<Customer>> {
    return this.http
      .get<PaginatedResult<Customer>>(`${environment.apiUrl}/customers`, { params: pageParams(page, { ...filters }) })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Clients actifs correspondant au texte (code, nom, email, chiffres du téléphone), pour une sélection. */
  search(q: string, size = 10): Observable<PaginatedResult<Customer>> {
    const params = new HttpParams().set('q', q).set('page', 0).set('size', size);
    return this.http
      .get<PaginatedResult<Customer>>(`${environment.apiUrl}/customers`, { params })
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

  /** Côté backend, « supprimer » désactive le client : ventes, règlements et dette le référencent. */
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

  /** Page des ventes du client : recherche (n° de vente) et tri côté serveur. */
  salesHistoryPage(customerId: string, page: PageRequest): Observable<PaginatedResult<Sale>> {
    return this.http
      .get<PaginatedResult<Sale>>(`${environment.apiUrl}/customers/${customerId}/sales`, { params: pageParams(page) })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Page des règlements du client : recherche (référence, note) et tri côté serveur. */
  paymentsPage(customerId: string, page: PageRequest): Observable<PaginatedResult<CustomerPayment>> {
    return this.http
      .get<PaginatedResult<CustomerPayment>>(`${environment.apiUrl}/customers/${customerId}/payments`, { params: pageParams(page) })
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
