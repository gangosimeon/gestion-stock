import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, finalize, map, of, shareReplay, skip, switchMap, tap } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { StockMovement } from '../../../core/models/stock-movement.model';
import { AuthService } from '../../../core/services/auth.service';
import { PageRequest } from '../../../core/services/page-params';
import { PaginatedResult, ProductsApiService } from '../../../core/services/products-api.service';
import { CreateStockMovementRequest, StockApiService, StockMovementsQuery } from '../../../core/services/stock-api.service';
import { StockDrawerState, StockFilters, StockMovementRow, StockVm } from './stock-vm.model';

/** Tous les abonnés de l'écran (pipes async, table) partagent un seul appel. */
const SHARED = { bufferSize: 1, refCount: true } as const;

/** Fin de la journée choisie (« Au » inclus), en heure locale. */
function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

@Injectable({
  providedIn: 'root'
})
export class StockFacade {
  private readonly stockApi = inject(StockApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly drawerSubject = new BehaviorSubject<StockDrawerState>({ opened: false });

  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  readonly drawer$ = this.drawerSubject.asObservable();

  /** Rechargements demandés après un mouvement manuel (liste paginée de l'écran). */
  readonly refresh$ = this.refreshSubject.pipe(skip(1));

  // Catalogue du backend (identifiants réels), comme les mouvements.
  private readonly products$ = this.refreshSubject.pipe(
    switchMap(() =>
      this.productsApi.list().pipe(
        map((r) => r.items),
        catchError(() => of([] as Product[]))
      )
    ),
    shareReplay(SHARED)
  );

  readonly vm$: Observable<StockVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.products$,
    // Interface seulement : le backend exige stock:adjust pour un mouvement manuel.
    this.auth.hasPermission$('stock:adjust')
  ]).pipe(
    map(([isLoading, errorMessage, products, canAdjust]): StockVm => ({
      isLoading,
      errorMessage,
      products,
      canAdjust
    })),
    shareReplay(SHARED)
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  /** Page de l'historique : recherche, période (« Au » inclus), produit, types, tri et pagination côté serveur. */
  search(page: PageRequest, filters: StockFilters): Observable<PaginatedResult<StockMovementRow>> {
    const query: StockMovementsQuery = {
      from: filters.from ? filters.from.toISOString() : undefined,
      to: filters.to ? endOfDay(filters.to).toISOString() : undefined,
      productId: filters.productId ?? undefined,
      type: filters.types?.length ? filters.types : undefined
    };
    return this.stockApi
      .findMovementsPage(page, query)
      .pipe(map((r) => ({ items: r.items.map((m) => this.toRow(m)), total: r.total })));
  }

  openDrawer(): void {
    this.drawerSubject.next({ opened: true });
  }

  closeDrawer(): void {
    this.drawerSubject.next({ opened: false });
  }

  createMovement(payload: CreateStockMovementRequest): Observable<StockMovement> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.stockApi.createMovement(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  toUiType(m: StockMovement): 'IN' | 'OUT' {
    return m.quantity >= 0 ? 'IN' : 'OUT';
  }

  /** Nom, référence et solde viennent du backend : plus de jointure avec le catalogue. */
  private toRow(m: StockMovement): StockMovementRow {
    return {
      ...m,
      productName: m.productName,
      sku: m.productSku,
      uiType: this.toUiType(m)
    };
  }
}
