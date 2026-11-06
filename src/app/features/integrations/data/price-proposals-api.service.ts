import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SILENT_API_ERROR } from '../../../core/interceptors/api-error.interceptor';
import { PaginatedResult } from '../../../core/services/products-api.service';

/** Proposition de prix d'une boutique (lot 3, G22a/G22b ; schéma `ChannelPrices.ProposalView`). */
export interface PriceProposal {
  proposalId: string;
  productId: string;
  productName: string;
  productSku: string;
  /** Montant formaté (ex. « 29,99 »), devise `currency`. */
  price: string;
  currency: string;
  status: string;
  /** Prix de référence GestStock au moment de la proposition. */
  referencePriceAtProposal: string;
  /** Prix de référence GestStock au moment de la lecture : alerte si différent de `referencePriceAtProposal`. */
  currentReferencePrice: string;
  note: string | null;
  proposedAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
}

/** Vue cross-liaison d'une proposition (lot 3, G24 ; schéma `CrossLinkProposalView`). */
export interface CrossLinkProposalView extends PriceProposal {
  linkId: string;
  shopName: string;
  linkStatus: string;
}

/**
 * Approbation des prix proposés par une boutique (lot 3, G22b ; `integration:price-approve`).
 * Erreurs silencieuses : l'écran les affiche lui-même ({@link SILENT_API_ERROR}).
 */
@Injectable({ providedIn: 'root' })
export class PriceProposalsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/integration-links`;
  private readonly cross = `${environment.apiUrl}/price-proposals`;
  private readonly options = { context: new HttpContext().set(SILENT_API_ERROR, true) };

  /** Toutes les propositions en attente (PROPOSED), paginées, toutes liaisons confondues (lot 3, G24). */
  listAll(page = 0, size = 10): Observable<PaginatedResult<CrossLinkProposalView>> {
    return this.http.get<PaginatedResult<CrossLinkProposalView>>(
      this.cross,
      { ...this.options, params: { page: String(page), size: String(size) } }
    );
  }

  approve(linkId: string, proposalId: string): Observable<PriceProposal> {
    return this.http.post<PriceProposal>(
      `${this.base}/${encodeURIComponent(linkId)}/price-proposals/${encodeURIComponent(proposalId)}/approve`,
      null,
      this.options
    );
  }

  reject(linkId: string, proposalId: string, reason: string): Observable<PriceProposal> {
    return this.http.post<PriceProposal>(
      `${this.base}/${encodeURIComponent(linkId)}/price-proposals/${encodeURIComponent(proposalId)}/reject`,
      { reason },
      this.options
    );
  }
}
