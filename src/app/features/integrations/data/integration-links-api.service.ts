import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SILENT_API_ERROR } from '../../../core/interceptors/api-error.interceptor';

/** Dépôt proposé pour une liaison (type `STORE` : magasin ; `WAREHOUSE` : entrepôt). */
export interface LinkWarehouseChoice {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

/** Demande de liaison déposée par la boutique (POST /api/integration-links/authorization-requests/lookup). */
export interface AuthorizationRequest {
  clientId: string;
  clientName: string;
  shopId: string;
  shopName: string;
  scopes: string[];
  expiresAt: string;
  currency: string;
  warehouses: LinkWarehouseChoice[];
}

/** URL de retour vers la boutique, à suivre par le navigateur (porte le code ou le refus). */
export interface AuthorizationRedirect {
  redirectUrl: string;
}

/**
 * Consentement d'une liaison boutique (/api/integration-links/authorization-requests/**, lot 2, G10). Le
 * `request_uri` voyage seulement dans le corps de ces trois POST : jamais dans une URL, jamais ailleurs.
 * Les erreurs restent des `HttpErrorResponse` : l'écran lit leur `code` et affiche lui-même le message et la
 * conduite à tenir (aucun bandeau global : {@link SILENT_API_ERROR}).
 */
@Injectable({ providedIn: 'root' })
export class IntegrationLinksApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/integration-links/authorization-requests`;
  private readonly options = { context: new HttpContext().set(SILENT_API_ERROR, true) };

  lookup(requestUri: string): Observable<AuthorizationRequest> {
    return this.http.post<AuthorizationRequest>(`${this.base}/lookup`, { requestUri }, this.options);
  }

  approve(requestUri: string, scopes: readonly string[], warehouseIds: readonly string[]): Observable<AuthorizationRedirect> {
    return this.http.post<AuthorizationRedirect>(`${this.base}/approve`, { requestUri, scopes, warehouseIds }, this.options);
  }

  deny(requestUri: string): Observable<AuthorizationRedirect> {
    return this.http.post<AuthorizationRedirect>(`${this.base}/deny`, { requestUri }, this.options);
  }
}
