import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
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

export interface TransferStockRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
}

export interface CreateWarehouseRequest {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class WarehousesApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResult<Warehouse>> {
    return this.http
      .get<PaginatedResult<Warehouse>>(`${environment.apiUrl}/warehouses`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  transfer(payload: TransferStockRequest): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .post<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/warehouses/transfer`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateWarehouseRequest): Observable<Warehouse> {
    return this.http
      .post<Warehouse>(`${environment.apiUrl}/warehouses`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
