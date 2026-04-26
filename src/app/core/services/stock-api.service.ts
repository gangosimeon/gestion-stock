import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StockMovement } from '../models/stock-movement.model';
import { PaginatedResult } from './products-api.service';

export interface StockMovementsQuery {
  from?: string; // ISO
  to?: string; // ISO
  productId?: string;
}

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
    return this.http.get<PaginatedResult<StockMovement>>(`${environment.apiUrl}/stock/movements`, {
      params: {
        ...(query.from ? { from: query.from } : null),
        ...(query.to ? { to: query.to } : null),
        ...(query.productId ? { productId: query.productId } : null)
      }
    });
  }

  createMovement(payload: CreateStockMovementRequest): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${environment.apiUrl}/stock/movements`, payload);
  }
}
