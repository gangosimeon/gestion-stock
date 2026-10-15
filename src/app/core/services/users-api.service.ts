import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Role } from '../models/role.model';
import { User } from '../models/user.model';
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

export interface CreateUserRequest {
  username: string;
  fullName: string;
  phone?: string;
  roles: Role[];
  isActive: boolean;
  /**
   * Mot de passe provisoire (le backend applique sa politique). Sans mot de passe, le compte
   * existe mais ne peut pas se connecter.
   */
  password?: string;
  /** Dépôts autorisés ; absent : aucun (l'utilisateur travaille alors dans le dépôt principal). */
  warehouseIds?: string[];
  /** Dépôt par défaut, parmi les dépôts autorisés (le backend l'y ajoute de toute façon). */
  defaultWarehouseId?: string;
}

/**
 * PUT /api/users/{id} : identifiant, nom et rôles remplacés ; téléphone absent = inchangé.
 * Dépôts : `warehouseIds` remplace la liste (absent = inchangée) ; `defaultWarehouseId` absent =
 * inchangé. Le statut et le mot de passe ont leurs routes dédiées.
 */
export interface UpdateUserRequest {
  username: string;
  fullName: string;
  phone?: string;
  roles: Role[];
  warehouseIds?: string[];
  defaultWarehouseId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersApiService {
  private readonly http = inject(HttpClient);

  /** Page d'utilisateurs : recherche (identifiant, nom, prénom, email), rôle, statut et tri côté serveur. */
  findPage(page: PageRequest, filters: { role?: Role | null; active?: boolean | null } = {}): Observable<PaginatedResult<User>> {
    return this.http
      .get<PaginatedResult<User>>(`${environment.apiUrl}/users`, { params: pageParams(page, { ...filters }) })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  list(): Observable<PaginatedResult<User>> {
    return this.http
      .get<PaginatedResult<User>>(`${environment.apiUrl}/users`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateUserRequest): Observable<User> {
    return this.http
      .post<User>(`${environment.apiUrl}/users`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  update(id: string, payload: UpdateUserRequest): Observable<User> {
    return this.http
      .put<User>(`${environment.apiUrl}/users/${id}`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  setActive(id: string, isActive: boolean): Observable<User> {
    return this.http
      .patch<User>(`${environment.apiUrl}/users/${id}/active`, { isActive })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Nouveau mot de passe, provisoire par défaut ; ferme les sessions de l'utilisateur (204). */
  resetPassword(id: string, password: string, temporary = true): Observable<void> {
    return this.http
      .put<void>(`${environment.apiUrl}/users/${id}/password`, { password, temporary })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Côté backend, « supprimer » désactive le compte : l'historique garde son auteur. */
  delete(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/users/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
