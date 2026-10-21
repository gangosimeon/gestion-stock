import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CompanyBranding } from '../../core/branding/branding.model';
import { BrandingRequest } from '../platform/data/platform.models';

/** Profil de l'entreprise connectée (GET /api/company/profile). */
export interface CompanyProfile {
  code: string;
  legalName: string;
  tradeName: string;
  sector?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  currency: string;
  plan: string;
  subscriptionEndsOn?: string | null;
  branding: CompanyBranding;
}

export interface CompanyProfileRequest {
  tradeName: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    return new Error((err.error?.message as string | undefined) ?? err.message);
  }
  return err instanceof Error ? err : new Error('Une erreur est survenue.');
}

/**
 * Profil et personnalisation de l'entreprise connectée (/api/company/**). L'entreprise visée est celle
 * de la session côté serveur : aucun identifiant n'est envoyé.
 */
@Injectable({ providedIn: 'root' })
export class CompanyApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/company`;

  profile(): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`${this.base}/profile`).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  updateProfile(request: CompanyProfileRequest): Observable<CompanyProfile> {
    return this.http.put<CompanyProfile>(`${this.base}/profile`, request).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  updateBranding(request: BrandingRequest): Observable<CompanyBranding> {
    return this.http.put<CompanyBranding>(`${this.base}/branding`, request).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  uploadLogo(file: File): Observable<CompanyBranding> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CompanyBranding>(`${this.base}/branding/logo`, form).pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  deleteLogo(): Observable<CompanyBranding> {
    return this.http.delete<CompanyBranding>(`${this.base}/branding/logo`).pipe(catchError((e) => throwError(() => toApiError(e))));
  }
}
