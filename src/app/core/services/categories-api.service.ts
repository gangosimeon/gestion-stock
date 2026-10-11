import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Category, CategoryRequest } from '../models/category.model';
import { PaginatedResult } from './products-api.service';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

/** Référentiel des catégories de produits (lecture : category:read ; gestion : category:manage). */
@Injectable({
  providedIn: 'root'
})
export class CategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categories`;

  /** Toutes les catégories, actives et désactivées (écran de gestion). */
  listAll(): Observable<PaginatedResult<Category>> {
    const params = new HttpParams().set('status', 'ALL').set('sort', 'name,asc');
    return this.http
      .get<PaginatedResult<Category>>(this.baseUrl, { params })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CategoryRequest): Observable<Category> {
    return this.http
      .post<Category>(this.baseUrl, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  update(id: string, payload: CategoryRequest): Observable<Category> {
    return this.http
      .put<Category>(`${this.baseUrl}/${id}`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Désactivée, une catégorie n'est plus proposée pour les produits ; ses produits la conservent. */
  setActive(id: string, active: boolean): Observable<Category> {
    return this.http
      .patch<Category>(`${this.baseUrl}/${id}/active`, { active })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
