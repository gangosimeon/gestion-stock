import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Category } from '../models/category.model';
import { Product, ProductUnit } from '../models/product.model';
import { PageRequest, pageParams } from './page-params';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

/** Statut d'un référentiel (actifs par défaut côté backend). */
export type ActiveStatusFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';

/** Critères de la liste des produits (GET /api/products). */
export interface ProductSearchFilters {
  categoryId?: string | null;
  supplierId?: string | null;
  status?: ActiveStatusFilter | null;
}

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

/**
 * Corps de POST/PUT /api/products. Le PUT remplace tout : les champs absents du formulaire
 * doivent être renvoyés tels quels (voir `toProductRequest`). Jamais de stock ici : il ne
 * change que par des mouvements de stock.
 */
export interface ProductRequest {
  sku: string;
  name: string;
  categoryId: string;
  supplierId?: string | null;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  alertThreshold: number;
  barcode?: string | null;
  description?: string | null;
  brandId?: string | null;
  unit?: ProductUnit | null;
  maxStockLevel?: number | null;
}

/** Requête de modification reprenant toutes les valeurs actuelles du produit. */
export function toProductRequest(p: Product): ProductRequest {
  return {
    sku: p.sku,
    name: p.name,
    categoryId: p.categoryId,
    supplierId: p.supplierId ?? null,
    purchasePrice: p.purchasePrice,
    retailPrice: p.retailPrice,
    wholesalePrice: p.wholesalePrice,
    alertThreshold: p.alertThreshold,
    barcode: p.barcode ?? null,
    description: p.description ?? null,
    brandId: p.brandId ?? null,
    unit: p.unit ?? null,
    maxStockLevel: p.maxStockLevel ?? null
  };
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

  /** Page de produits : recherche (référence, nom, code-barres), filtres et tri côté serveur. */
  findPage(page: PageRequest, filters: ProductSearchFilters = {}): Observable<PaginatedResult<Product>> {
    const params = pageParams(page, { ...filters });
    return this.http
      .get<PaginatedResult<Product>>(`${environment.apiUrl}/products`, { params })
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

  create(payload: ProductRequest): Observable<Product> {
    return this.http
      .post<Product>(`${environment.apiUrl}/products`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  update(id: string, payload: ProductRequest): Observable<Product> {
    return this.http
      .put<Product>(`${environment.apiUrl}/products/${id}`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Côté backend, « supprimer » désactive le produit : ventes et mouvements passés restent intacts. */
  delete(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/products/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
