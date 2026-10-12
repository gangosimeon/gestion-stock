import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StockMovement } from '../models/stock-movement.model';
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

  createMovement(payload: CreateStockMovementRequest): Observable<StockMovement> {
    return this.http
      .post<StockMovement>(`${environment.apiUrl}/stock/movements`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
