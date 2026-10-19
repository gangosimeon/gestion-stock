import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StockMovement, StockMovementType } from '../models/stock-movement.model';
import { StockTransfer, StockTransferDirection, StockTransferStatus } from '../models/stock-transfer.model';
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

export interface StockMovementsQuery {
  from?: string; // ISO (instant inclus)
  to?: string; // ISO (instant inclus)
  productId?: string;
  /** Types détaillés (plusieurs possibles). */
  type?: StockMovementType[];
}

/**
 * Mouvement manuel dans le dépôt courant (X-Warehouse-Id). Le backend contrôle le sens selon
 * le motif (SUPPLY > 0, SALE et LOSS < 0, ADJUSTMENT ≠ 0) et refuse un stock insuffisant.
 */
export interface CreateStockMovementRequest {
  productId: string;
  quantity: number;
  reason: StockMovement['reason'];
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StockApiService {
  private readonly http = inject(HttpClient);

  listMovements(query: StockMovementsQuery = {}): Observable<PaginatedResult<StockMovement>> {
    return this.http
      .get<PaginatedResult<StockMovement>>(`${environment.apiUrl}/stock/movements`, {
        params: {
          ...(query.from ? { from: query.from } : null),
          ...(query.to ? { to: query.to } : null),
          ...(query.productId ? { productId: query.productId } : null)
        }
      })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /**
   * Page de mouvements : recherche (produit, motif, pièce source, utilisateur), période, produit,
   * types et tri côté serveur.
   */
  findMovementsPage(page: PageRequest, query: StockMovementsQuery = {}): Observable<PaginatedResult<StockMovement>> {
    return this.http
      .get<PaginatedResult<StockMovement>>(`${environment.apiUrl}/stock/movements`, { params: pageParams(page, { ...query }) })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  createMovement(payload: CreateStockMovementRequest): Observable<StockMovement> {
    return this.http
      .post<StockMovement>(`${environment.apiUrl}/stock/movements`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /**
   * Historique des transferts envoyés par le dépôt courant ou reçus par lui : recherche (numéro,
   * produit, note), sens, statut, période (jours `AAAA-MM-JJ` inclus) et tri côté serveur.
   */
  findTransfersPage(page: PageRequest, filters: StockTransfersQuery = {}): Observable<PaginatedResult<StockTransfer>> {
    const params = pageParams(page, {
      direction: filters.direction,
      status: filters.status,
      from: filters.from,
      to: filters.to,
      allWarehouses: filters.allWarehouses ? true : null
    });
    return this.http
      .get<PaginatedResult<StockTransfer>>(`${environment.apiUrl}/stock/transfers`, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  getTransfer(id: string): Observable<StockTransfer> {
    return this.http
      .get<StockTransfer>(`${environment.apiUrl}/stock/transfers/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Retour au dépôt d'origine, en totalité et une seule fois (stock:transfer, depuis l'un des deux dépôts). */
  returnTransfer(id: string, reason?: string | null): Observable<StockTransfer> {
    return this.http
      .post<StockTransfer>(`${environment.apiUrl}/stock/transfers/${id}/return`, { reason: reason || null })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}

export interface StockTransfersQuery {
  direction?: StockTransferDirection | null;
  status?: StockTransferStatus | null;
  /** Jour `AAAA-MM-JJ` inclus. */
  from?: string | null;
  to?: string | null;
  allWarehouses?: boolean;
}
