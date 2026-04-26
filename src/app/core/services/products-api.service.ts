import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

@Injectable({
  providedIn: 'root'
})
export class ProductsApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResult<Product>> {
    return this.http
      .get<PaginatedResult<Product>>(`${environment.apiUrl}/products`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  getById(id: string): Observable<Product> {
    return this.http
      .get<Product>(`${environment.apiUrl}/products/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  listCategories(): Observable<PaginatedResult<Category>> {
    return this.http
      .get<PaginatedResult<Category>>(`${environment.apiUrl}/categories`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: Omit<Product, 'id'>): Observable<Product> {
    return this.http
      .post<Product>(`${environment.apiUrl}/products`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  update(id: string, patch: Partial<Omit<Product, 'id'>>): Observable<Product> {
    return this.http
      .put<Product>(`${environment.apiUrl}/products/${id}`, patch)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  delete(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/products/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
