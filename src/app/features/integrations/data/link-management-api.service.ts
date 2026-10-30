import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SILENT_API_ERROR } from '../../../core/interceptors/api-error.interceptor';
import { Warehouse } from '../../../core/models/warehouse.model';
import { PaginatedResult } from '../../../core/services/products-api.service';
import { LinkWarehouseChoice } from './integration-links-api.service';

export type LinkStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

/**
 * Liaison de l'entreprise (GET /api/integration-links, schéma `IntegrationLink`) : aucune empreinte ni aucun
 * secret n'y figure.
 */
export interface ManagedLink {
  id: string;
  shopId: string;
  shopName: string;
  status: LinkStatus;
  suspensionReason: string | null;
  revocationReason: string | null;
  currency: string;
  scopes: string[];
  warehouses: LinkWarehouseChoice[];
  /** Nom d'utilisateur de la personne responsable de la liaison. */
  authorizedBy: string;
  createdAt: string;
  activatedAt: string | null;
  suspendedAt: string | null;
  revokedAt: string | null;
}

/**
 * Gestion des liaisons boutique de l'entreprise (/api/integration-links, lot 2, G10 et G4a ; `integration:manage`).
 * Les erreurs restent des `HttpErrorResponse` : l'écran lit leur `code` et les affiche lui-même (aucun bandeau
 * global : {@link SILENT_API_ERROR}).
 */
@Injectable({ providedIn: 'root' })
export class LinkManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/integration-links`;
  private readonly options = { context: new HttpContext().set(SILENT_API_ERROR, true) };

  list(): Observable<ManagedLink[]> {
    return this.http.get<ManagedLink[]>(this.base, this.options);
  }

  suspend(id: string): Observable<ManagedLink> {
    return this.http.post<ManagedLink>(`${this.base}/${encodeURIComponent(id)}/suspend`, null, this.options);
  }

  /** Les dépôts reconfirmés remplacent la liste de la liaison ; la personne connectée en devient responsable. */
  reactivate(id: string, warehouseIds: readonly string[]): Observable<ManagedLink> {
    return this.http.post<ManagedLink>(`${this.base}/${encodeURIComponent(id)}/reactivate`, { warehouseIds }, this.options);
  }

  revoke(id: string): Observable<ManagedLink> {
    return this.http.post<ManagedLink>(`${this.base}/${encodeURIComponent(id)}/revoke`, null, this.options);
  }

  /**
   * Dépôts actifs accessibles à la personne connectée (GET /api/warehouses sans pagination : liste complète de son
   * périmètre, la même règle que le contrôle du serveur à la réactivation).
   */
  accessibleWarehouses(): Observable<LinkWarehouseChoice[]> {
    return this.http.get<PaginatedResult<Warehouse>>(`${environment.apiUrl}/warehouses`, this.options).pipe(
      map((page) =>
        page.items
          .filter((w) => w.active !== false)
          .map((w) => ({ id: w.id, code: w.code ?? '', name: w.name, type: w.type ?? 'STORE', active: true }))
      )
    );
  }
}
