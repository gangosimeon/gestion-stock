import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StockMovement } from '../models/stock-movement.model';
import { Warehouse } from '../models/warehouse.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

/** Transfert entre deux dépôts : sortie et entrée liées, dans une seule transaction backend. */
export interface TransferStockRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  note?: string;
}

export interface TransferStockResponse {
  ok: boolean;
  transferId: string;
  /** Mouvement de sortie (dépôt source) et d'entrée (dépôt destination). */
  out: StockMovement;
  in: StockMovement;
}

/** POST /api/warehouses : seul le nom est obligatoire (code généré par le backend s'il manque). */
export interface CreateWarehouseRequest {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WarehousesApiService {
  private readonly http = inject(HttpClient);

  /** Dépôts visibles par l'utilisateur (filtrés par le backend selon ses droits). */
  list(): Observable<PaginatedResult<Warehouse>> {
    return this.http
      .get<PaginatedResult<Warehouse>>(`${environment.apiUrl}/warehouses`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Dépôt appliqué par le backend sans choix explicite (dépôt par défaut, sinon principal). */
  current(): Observable<Warehouse> {
    return this.http
      .get<Warehouse>(`${environment.apiUrl}/warehouses/current`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  transfer(payload: TransferStockRequest): Observable<TransferStockResponse> {
    return this.http
      .post<TransferStockResponse>(`${environment.apiUrl}/warehouses/transfer`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateWarehouseRequest): Observable<Warehouse> {
    return this.http
      .post<Warehouse>(`${environment.apiUrl}/warehouses`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
