import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StockMovement } from '../models/stock-movement.model';
import { StockTransfer } from '../models/stock-transfer.model';
import { Warehouse } from '../models/warehouse.model';
import { PageRequest, pageParams } from './page-params';
import { ActiveStatusFilter, PaginatedResult } from './products-api.service';

/** Type de dépôt (magasin de vente ou entrepôt). */
export type WarehouseTypeFilter = 'STORE' | 'WAREHOUSE';

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? err.message);
  }

  if (err instanceof Error) return err;
  return new Error('Une erreur est survenue.');
}

/**
 * Transfert d'un ou plusieurs produits entre deux dépôts : sorties et entrées liées, dans une
 * seule transaction backend (un produit insuffisant annule tout). Un produit au plus une fois.
 */
export interface TransferStockRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: { productId: string; quantity: number }[];
  note?: string;
}

export interface TransferStockResponse {
  ok: boolean;
  transferId: string;
  /** Sortie et entrée de la première ligne (contrat d'origine). */
  out: StockMovement;
  in: StockMovement;
  /** Tous les mouvements, par ligne : sortie puis entrée. */
  movements: StockMovement[];
  /** Pièce enregistrée (numéro TRF-…) : contenu du reçu. */
  transfer: StockTransfer;
}

/** POST /api/warehouses : seul le nom est obligatoire (code généré par le backend s'il manque). */
export interface CreateWarehouseRequest {
  name: string;
  /** Magasin (point de vente) ou entrepôt ; le code généré en dépend (MAG-nn / DEP-nn). */
  type?: WarehouseTypeFilter;
  code?: string;
  address?: string;
  phone?: string;
}

/** PUT /api/warehouses/{id} : code ou type absent = inchangé (warehouse:manage). */
export interface UpdateWarehouseRequest {
  name: string;
  code?: string;
  type?: WarehouseTypeFilter;
  address?: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WarehousesApiService {
  private readonly http = inject(HttpClient);

  /** Dépôts visibles par l'utilisateur (filtrés par le backend selon ses droits). */
  /**
   * Page de dépôts : recherche (code, nom), type et tri côté serveur ; le statut n'est appliqué
   * que pour un utilisateur qui voit tous les dépôts (warehouse:all).
   */
  findPage(
    page: PageRequest,
    filters: { status?: ActiveStatusFilter | null; type?: WarehouseTypeFilter | null } = {}
  ): Observable<PaginatedResult<Warehouse>> {
    return this.http
      .get<PaginatedResult<Warehouse>>(`${environment.apiUrl}/warehouses`, { params: pageParams(page, { ...filters }) })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  list(): Observable<PaginatedResult<Warehouse>> {
    return this.http
      .get<PaginatedResult<Warehouse>>(`${environment.apiUrl}/warehouses`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Dépôt appliqué par le backend sans choix explicite (dépôt par défaut, sinon principal). */
  current(): Observable<Warehouse> {
    return this.http
      .get<Warehouse>(`${environment.apiUrl}/warehouses/current`)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  transfer(payload: TransferStockRequest): Observable<TransferStockResponse> {
    return this.http
      .post<TransferStockResponse>(`${environment.apiUrl}/warehouses/transfer`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  create(payload: CreateWarehouseRequest): Observable<Warehouse> {
    return this.http
      .post<Warehouse>(`${environment.apiUrl}/warehouses`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  update(id: string, payload: UpdateWarehouseRequest): Observable<Warehouse> {
    return this.http
      .put<Warehouse>(`${environment.apiUrl}/warehouses/${id}`, payload)
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Activation ou désactivation ; le dépôt principal ne peut pas être désactivé (MAIN_WAREHOUSE_REQUIRED). */
  setActive(id: string, active: boolean): Observable<Warehouse> {
    return this.http
      .patch<Warehouse>(`${environment.apiUrl}/warehouses/${id}/active`, { active })
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }

  /** Nouveau dépôt principal (actif ; réservé à warehouse:all). */
  setMain(id: string): Observable<Warehouse> {
    return this.http
      .post<Warehouse>(`${environment.apiUrl}/warehouses/${id}/main`, {})
      .pipe(catchError((e: unknown) => throwError(() => toApiError(e))));
  }
}
