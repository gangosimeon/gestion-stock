import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CompanyBranding } from '../../../core/branding/branding.model';
import { PageRequest, pageParams } from '../../../core/services/page-params';
import { PaginatedResult } from '../../../core/services/products-api.service';
import {
  ActivationLink,
  BrandingRequest,
  Company,
  CompanyListItem,
  CompanyRequest,
  CompanyStatus,
  PlatformAuditEntry,
  PlatformStats
} from './platform.models';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }
  return err instanceof Error ? err : new Error('Une erreur est survenue.');
}

/** API Super Admin (/api/platform/**) : jeton plateforme ajouté par platformInterceptor. */
@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/platform`;

  stats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.base}/stats`).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  companies(page: PageRequest, filters: { status?: CompanyStatus | null } = {}): Observable<PaginatedResult<CompanyListItem>> {
    return this.http
      .get<PaginatedResult<CompanyListItem>>(`${this.base}/companies`, { params: pageParams(page, { ...filters }) })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  company(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.base}/companies/${id}`).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  /** Création ; la clé d'idempotence évite un doublon en cas de double envoi ou de nouvelle tentative. */
  create(request: CompanyRequest, idempotencyKey: string): Observable<Company> {
    return this.http
      .post<Company>(`${this.base}/companies`, request, { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  update(id: string, request: CompanyRequest): Observable<Company> {
    return this.http.put<Company>(`${this.base}/companies/${id}`, request).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  suspend(id: string, reason: string): Observable<Company> {
    return this.http
      .post<Company>(`${this.base}/companies/${id}/suspend`, { reason })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  reactivate(id: string): Observable<Company> {
    return this.http
      .post<Company>(`${this.base}/companies/${id}/reactivate`, {})
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  retryProvisioning(id: string): Observable<Company> {
    return this.http
      .post<Company>(`${this.base}/companies/${id}/provisioning/retry`, {})
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  adminAccessLink(id: string): Observable<ActivationLink> {
    return this.http
      .post<ActivationLink>(`${this.base}/companies/${id}/admin-access-link`, {})
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  branding(id: string): Observable<CompanyBranding> {
    return this.http
      .get<CompanyBranding>(`${this.base}/companies/${id}/branding`)
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  updateBranding(id: string, request: BrandingRequest): Observable<CompanyBranding> {
    return this.http
      .put<CompanyBranding>(`${this.base}/companies/${id}/branding`, request)
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  setBrandingPermission(id: string, companyCanEdit: boolean): Observable<CompanyBranding> {
    return this.http
      .put<CompanyBranding>(`${this.base}/companies/${id}/branding/permission`, { companyCanEdit })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  uploadLogo(id: string, file: File): Observable<CompanyBranding> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<CompanyBranding>(`${this.base}/companies/${id}/branding/logo`, form)
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  deleteLogo(id: string): Observable<CompanyBranding> {
    return this.http
      .delete<CompanyBranding>(`${this.base}/companies/${id}/branding/logo`)
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  auditLog(page: PageRequest, companyId?: string | null): Observable<PaginatedResult<PlatformAuditEntry>> {
    return this.http
      .get<PaginatedResult<PlatformAuditEntry>>(`${this.base}/audit-log`, { params: pageParams(page, { companyId }) })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }
}
