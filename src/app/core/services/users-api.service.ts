import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Role } from '../models/role.model';
import { User } from '../models/user.model';
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
}

export interface UpdateUserRequest {
  username: string;
  fullName: string;
  phone?: string;
  roles: Role[];
}

@Injectable({
  providedIn: 'root'
})
export class UsersApiService {
  private readonly http = inject(HttpClient);

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

  delete(id: string): Observable<{ ok: true } | { ok: boolean }> {
    return this.http
      .delete<{ ok: true } | { ok: boolean }>(`${environment.apiUrl}/users/${id}`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
