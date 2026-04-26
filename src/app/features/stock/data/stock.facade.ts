import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, map, switchMap, tap } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { StockMovement } from '../../../core/models/stock-movement.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { CreateStockMovementRequest, StockApiService, StockMovementsQuery } from '../../../core/services/stock-api.service';
import { StockDrawerState, StockFilters, StockMovementRow, StockVm } from './stock-vm.model';

@Injectable({
  providedIn: 'root'
})
export class StockFacade {
  private readonly stockApi = inject(StockApiService);
  private readonly productsApi = inject(ProductsApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly drawerSubject = new BehaviorSubject<StockDrawerState>({ opened: false });

  private readonly filtersSubject = new BehaviorSubject<StockFilters>({
    from: null,
    to: null,
    productId: null
  });

  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  readonly drawer$ = this.drawerSubject.asObservable();

  private readonly products$ = this.refreshSubject.pipe(
    switchMap(() => this.productsApi.list()),
    map((r) => r.items)
  );

  private readonly movements$ = combineLatest([this.refreshSubject, this.filtersSubject]).pipe(
    tap(() => {
      this.isLoadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    switchMap(([, filters]) => {
      const query: StockMovementsQuery = {
        from: filters.from ? filters.from.toISOString() : undefined,
        to: filters.to ? filters.to.toISOString() : undefined,
        productId: filters.productId ?? undefined
      };

      return this.stockApi.listMovements(query).pipe(
        map((r) => r.items),
        finalize(() => this.isLoadingSubject.next(false)),
        tap({
          error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur de chargement')
        })
      );
    })
  );

  readonly vm$ = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.products$,
    this.movements$,
    this.filtersSubject
  ]).pipe(
    map(([isLoading, errorMessage, products, movements, filters]): StockVm => {
      const enriched = this.enrich(movements, products);
      return {
        isLoading,
        errorMessage,
        products,
        movements: enriched,
        filters
      };
    })
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  setFilters(patch: Partial<StockFilters>): void {
    this.filtersSubject.next({ ...this.filtersSubject.value, ...patch });
  }

  openDrawer(): void {
    this.drawerSubject.next({ opened: true });
  }

  closeDrawer(): void {
    this.drawerSubject.next({ opened: false });
  }

  createMovement(payload: CreateStockMovementRequest): unknown {
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

  private enrich(movements: StockMovement[], products: Product[]): StockMovementRow[] {
    return movements.map((m) => {
      const p = products.find((x) => x.id === m.productId);
      return {
        ...m,
        productName: p?.name,
        sku: p?.sku,
        uiType: this.toUiType(m)
      };
    });
  }
}
