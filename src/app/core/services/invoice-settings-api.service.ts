import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  InvoiceLogoInfo,
  InvoiceSettings,
  InvoiceSettingsResponse
} from '../models/invoice-settings.model';

/** Logo accepté par le serveur (vérifié aussi côté serveur, sur le contenu réel du fichier). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_ACCEPTED_TYPES = ['image/png', 'image/jpeg'] as const;

/** Configuration chargée, avec le logo prêt à afficher, imprimer ou exporter (data URL). */
export interface LoadedInvoiceSettings {
  settings: InvoiceSettingsResponse;
  logoUrl: string | null;
}

/** Appels de /api/settings/invoice. */
@Injectable({
  providedIn: 'root'
})
export class InvoiceSettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/settings/invoice`;

  get(): Observable<InvoiceSettingsResponse> {
    return this.http.get<InvoiceSettingsResponse>(this.baseUrl);
  }

  update(settings: InvoiceSettings): Observable<InvoiceSettingsResponse> {
    return this.http.put<InvoiceSettingsResponse>(this.baseUrl, settings);
  }

  reset(): Observable<InvoiceSettingsResponse> {
    return this.http.post<InvoiceSettingsResponse>(`${this.baseUrl}/reset`, null);
  }

  /** Image du logo, lue avec le jeton de l'utilisateur (une balise <img> ne l'enverrait pas). */
  logo(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/logo`, { responseType: 'blob' });
  }

  uploadLogo(file: File): Observable<InvoiceLogoInfo> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<InvoiceLogoInfo>(`${this.baseUrl}/logo`, body);
  }

  deleteLogo(): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/logo`);
  }
}

/** Lit un fichier ou une réponse binaire en data URL (utilisable hors de la page : impression, PDF). */
export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Configuration de la facture partagée par les écrans de vente : chargée une fois, puis
 * remplacée dès qu'un administrateur l'enregistre. En cas d'échec, l'appel suivant réessaie.
 */
@Injectable({
  providedIn: 'root'
})
export class InvoiceSettingsStore {
  private readonly api = inject(InvoiceSettingsApiService);
  private cache: Observable<LoadedInvoiceSettings> | null = null;

  load(): Observable<LoadedInvoiceSettings> {
    if (!this.cache) {
      this.cache = this.api.get().pipe(
        switchMap((settings) => this.withLogo(settings)),
        catchError((e: unknown) => {
          this.cache = null;
          return throwError(() => e);
        }),
        shareReplay(1)
      );
    }
    return this.cache;
  }

  /** Configuration confirmée par le serveur (après enregistrement). */
  set(loaded: LoadedInvoiceSettings): void {
    this.cache = of(loaded);
  }

  invalidate(): void {
    this.cache = null;
  }

  /** Ajoute l'image du logo enregistré ; un logo illisible n'empêche pas d'afficher la facture. */
  withLogo(settings: InvoiceSettingsResponse): Observable<LoadedInvoiceSettings> {
    if (!settings.logo) {
      return of({ settings, logoUrl: null });
    }
    return this.api.logo().pipe(
      switchMap((blob) => from(readAsDataUrl(blob))),
      map((logoUrl) => ({ settings, logoUrl })),
      catchError(() => of({ settings, logoUrl: null }))
    );
  }

  /** Recharge depuis le serveur et met le cache à jour. */
  refresh(): Observable<LoadedInvoiceSettings> {
    this.cache = null;
    return this.load().pipe(tap((loaded) => this.set(loaded)));
  }
}
