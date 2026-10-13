import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, finalize, map, of, shareReplay, skip, switchMap, tap } from 'rxjs';

import { StockAlertType } from '../../../core/models/alert.model';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { Supplier } from '../../../core/models/supplier.model';
import { AlertsApiService } from '../../../core/services/alerts-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageRequest } from '../../../core/services/page-params';
import {
  PaginatedResult,
  ProductRequest,
  ProductSearchFilters,
  ProductsApiService
} from '../../../core/services/products-api.service';
import { SuppliersApiService } from '../../../core/services/suppliers-api.service';
import { ProductDrawerMode, ProductDrawerState, ProductListVm } from './product-vm.model';

/** Tous les abonnés de l'écran (pipes async, table) partagent un seul appel. */
const SHARED = { bufferSize: 1, refCount: true } as const;

@Injectable({
  providedIn: 'root'
})
export class ProductsFacade {
  private readonly api = inject(ProductsApiService);
  private readonly alertsApi = inject(AlertsApiService);
  private readonly suppliersApi = inject(SuppliersApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  private readonly drawerSubject = new BehaviorSubject<ProductDrawerState>({
    opened: false,
    mode: 'detail',
    productId: null
  });

  readonly drawer$ = this.drawerSubject.asObservable();

  /** Rechargements demandés après création, modification ou suppression (liste paginée de l'écran). */
  readonly refresh$ = this.refreshSubject.pipe(skip(1));

  /** Niveaux de stock calculés par le backend (alertes), rechargés avec la liste. */
  private readonly stockLevels$ = this.refreshSubject.pipe(
    switchMap(() => this.alertsApi.stockLevels().pipe(catchError(() => of(new Map<string, StockAlertType>())))),
    shareReplay(SHARED)
  );

  private readonly categories$ = this.api.listCategories().pipe(
    map((r) => r.items),
    catchError(() => of([] as Category[])),
    shareReplay(SHARED)
  );

  // Fournisseurs du backend (identifiants réels, assignables au produit).
  private readonly suppliers$ = this.suppliersApi.list().pipe(
    map((r) => r.items),
    catchError(() => of([] as Supplier[])),
    shareReplay(SHARED)
  );

  private readonly rights$ = combineLatest([
    this.auth.hasPermission$('product:create'),
    this.auth.hasPermission$('product:update'),
    this.auth.hasPermission$('product:delete')
  ]);

  readonly vm$: Observable<ProductListVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.stockLevels$,
    this.categories$,
    this.suppliers$,
    this.rights$
  ]).pipe(
    map(([isLoading, errorMessage, stockLevels, categories, suppliers, [canCreate, canUpdate, canDelete]]): ProductListVm => ({
      isLoading,
      errorMessage,
      stockLevels,
      categories,
      suppliers,
      canCreate,
      canUpdate,
      canDelete
    })),
    shareReplay(SHARED)
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  /** Page de la liste : recherche, filtres, tri et pagination traités par le backend. */
  search(page: PageRequest, filters: ProductSearchFilters): Observable<PaginatedResult<Product>> {
    return this.api.findPage(page, filters);
  }

  openDrawer(mode: ProductDrawerMode, productId: string | null): void {
    this.drawerSubject.next({ opened: true, mode, productId });
  }

  closeDrawer(): void {
    const current = this.drawerSubject.value;
    this.drawerSubject.next({ ...current, opened: false });
  }

  getProductById(productId: string): Observable<Product> {
    // exposé pour le composant drawer, évite de dupliquer la logique.
    return this.api.getById(productId);
  }

  save(payload: ProductRequest, productId: string | null): Observable<Product> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    const op$ = productId
      ? this.api.update(productId, payload)
      : this.api.create(payload);

    return op$.pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur de sauvegarde')
      })
    );
  }

  delete(productId: string): Observable<unknown> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.delete(productId).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur de suppression')
      })
    );
  }

  resolveCategoryName(product: Product, categories: readonly Category[]): string {
    return product.categoryName ?? categories.find((c) => c.id === product.categoryId)?.name ?? '—';
  }

  resolveSupplierName(product: Product, suppliers: readonly Supplier[]): string {
    if (!product.supplierId) return '—';
    return suppliers.find((s) => s.id === product.supplierId)?.name ?? '—';
  }

  /** Statut fourni par le backend (seuil du produit ou seuil par défaut, marge configurable). */
  isLowStock(product: Product, levels: ReadonlyMap<string, StockAlertType>): boolean {
    const level = levels.get(product.id);
    return level === 'BELOW_MINIMUM' || level === 'LOW_STOCK';
  }

  availabilityLabel(product: Product, levels: ReadonlyMap<string, StockAlertType>): string {
    const level = levels.get(product.id);
    if (level === 'OUT_OF_STOCK') return 'Rupture';
    if (level === 'BELOW_MINIMUM' || level === 'LOW_STOCK') return 'Stock faible';
    return 'Disponible';
  }
}
