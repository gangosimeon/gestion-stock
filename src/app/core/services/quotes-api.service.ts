import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Quote, QuoteReference, QuoteRequest, QuoteSearchFilters } from '../models/quote.model';
import { PageRequest, pageParams } from './page-params';
import { PaginatedResult } from './products-api.service';

/**
 * Devis (`/api/quotes`, permissions quote:read / quote:manage). Un devis ne touche ni au stock
 * ni à la caisse ; sa facture est la vente enregistrée à la caisse puis rattachée au devis.
 */
@Injectable({
  providedIn: 'root'
})
export class QuotesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/quotes`;

  /** Recherche (n°, client, objet), statut, période (date du devis), tri et pagination côté serveur. */
  page(page: PageRequest, filters: QuoteSearchFilters = {}): Observable<PaginatedResult<Quote>> {
    const params = pageParams(page, {
      status: filters.status,
      from: filters.from,
      to: filters.to,
      allWarehouses: filters.allWarehouses ? true : null
    });
    return this.http.get<PaginatedResult<Quote>>(this.baseUrl, { params });
  }

  get(id: string): Observable<Quote> {
    return this.http.get<Quote>(`${this.baseUrl}/${id}`);
  }

  create(request: QuoteRequest): Observable<Quote> {
    return this.http.post<Quote>(this.baseUrl, request);
  }

  update(id: string, request: QuoteRequest): Observable<Quote> {
    return this.http.put<Quote>(`${this.baseUrl}/${id}`, request);
  }

  issue(id: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/${id}/issue`, null);
  }

  accept(id: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/${id}/accept`, null);
  }

  refuse(id: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/${id}/refuse`, null);
  }

  cancel(id: string, reason: string | null): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/${id}/cancel`, { reason });
  }

  duplicate(id: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/${id}/duplicate`, null);
  }

  /** Rattache la vente (facture) enregistrée à la caisse ; répéter la même demande est sans effet. */
  invoice(id: string, saleId: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/${id}/invoice`, { saleId });
  }

  /** Devis facturé par une vente, ou null (réponse vide). */
  forSale(saleId: string): Observable<QuoteReference | null> {
    return this.http.get<QuoteReference | null>(`${this.baseUrl}/for-sale/${saleId}`).pipe(map((r) => r ?? null));
  }
}
