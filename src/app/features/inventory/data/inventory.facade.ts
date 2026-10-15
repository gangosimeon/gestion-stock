import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { InventorySession } from '../../../core/models/inventory.model';
import { AuthService } from '../../../core/services/auth.service';
import { PaginatedResult, ProductsApiService } from '../../../core/services/products-api.service';
import { CreateInventorySessionRequest, InventoryApiService } from '../../../core/services/inventory-api.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';

export interface InventoryVm {
  isLoading: boolean;
  errorMessage: string | null;
  /** Produits actifs du dépôt courant, stock lu sur le backend. */
  products: Product[];
  /** inventory:create — saisir un inventaire (interface seulement). */
  canCreate: boolean;
  /** inventory:validate — l'inventaire est validé (stock ajusté) dès l'enregistrement. */
  canValidate: boolean;
}

/**
 * Inventaire en une fois (contrat historique /api/inventory/sessions) : le backend saisit le
 * stock système, calcule les écarts et, avec inventory:validate, ajuste le stock.
 */
@Injectable({
  providedIn: 'root'
})
export class InventoryFacade {
  private readonly productsApi = inject(ProductsApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  // Catalogue du backend (le catalogue simulé ne sert plus qu'aux rapports).
  private readonly products$ = this.refreshSubject.pipe(
    tap(() => {
      this.isLoadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    switchMap(() =>
      this.productsApi.list().pipe(
        map((r) => r.items.filter((p) => p.active !== false)),
        catchError((e: unknown) => {
          this.errorSubject.next(e instanceof Error ? e.message : 'Erreur');
          return of([] as Product[]);
        }),
        finalize(() => this.isLoadingSubject.next(false))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$: Observable<InventoryVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.products$,
    this.auth.hasPermission$('inventory:create'),
    this.auth.hasPermission$('inventory:validate')
  ]).pipe(
    map(([isLoading, errorMessage, products, canCreate, canValidate]): InventoryVm => ({
      isLoading,
      errorMessage,
      products,
      canCreate,
      canValidate
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    // Autre dépôt : données rechargées (sans abonné, le prochain affichage les recharge de toute façon).
    inject(WarehouseContextService).warehouseChanged$.subscribe(() => this.refresh());
  }

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  createSession(payload: CreateInventorySessionRequest): Observable<InventorySession> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.inventoryApi.createSession(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        // Stocks à jour après un inventaire validé.
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  listSessions(): Observable<PaginatedResult<InventorySession>> {
    return this.inventoryApi.listSessions();
  }

  getSessionById(id: string): Observable<InventorySession> {
    return this.inventoryApi.getSessionById(id);
  }
}
