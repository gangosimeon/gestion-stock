import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, map, of, switchMap, tap } from 'rxjs';

import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { Supplier } from '../../../core/models/supplier.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { SuppliersApiService } from '../../../core/services/suppliers-api.service';
import { ProductDrawerMode, ProductDrawerState, ProductListVm } from './product-vm.model';

@Injectable({
  providedIn: 'root'
})
export class ProductsFacade {
  private readonly api = inject(ProductsApiService);
  private readonly suppliersApi = inject(SuppliersApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly filterSubject = new BehaviorSubject<string>('');

  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  private readonly drawerSubject = new BehaviorSubject<ProductDrawerState>({
    opened: false,
    mode: 'detail',
    productId: null
  });

  readonly drawer$ = this.drawerSubject.asObservable();

  private readonly products$ = this.refreshSubject.pipe(
    tap(() => {
      this.isLoadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    switchMap(() =>
      this.api.list().pipe(
        map((r) => r.items),
        tap({
          error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur de chargement')
        }),
        finalize(() => this.isLoadingSubject.next(false))
      )
    )
  );

  private readonly categories$ = this.api.listCategories().pipe(map((r) => r.items));

  private readonly suppliers$ = this.suppliersApi.list().pipe(map((r) => r.items));

  readonly vm$ = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.products$,
    this.categories$,
    this.suppliers$,
    this.filterSubject
  ]).pipe(
    map(([isLoading, errorMessage, products, categories, suppliers, filter]): ProductListVm => ({
      isLoading,
      errorMessage,
      products,
      categories,
      suppliers,
      filter
    }))
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  setFilter(value: string): void {
    this.filterSubject.next(value);
  }

  openDrawer(mode: ProductDrawerMode, productId: string | null): void {
    this.drawerSubject.next({ opened: true, mode, productId });
  }

  closeDrawer(): void {
    const current = this.drawerSubject.value;
    this.drawerSubject.next({ ...current, opened: false });
  }

  getProductById(productId: string): unknown {
    // exposé pour le composant drawer, évite de dupliquer la logique.
    return this.api.getById(productId);
  }

  save(payload: Omit<Product, 'id'>, productId: string | null): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    const op$ = productId ? this.api.update(productId, payload) : this.api.create(payload);

    return op$.pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur de sauvegarde')
      })
    );
  }

  delete(productId: string): unknown {
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

  isLowStock(product: Product): boolean {
    return product.stockQuantity <= product.alertThreshold;
  }

  availabilityLabel(product: Product): string {
    if (product.stockQuantity <= 0) return 'Rupture';
    if (this.isLowStock(product)) return 'Stock faible';
    return 'Disponible';
  }
}
