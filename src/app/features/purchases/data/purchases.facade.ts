import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, finalize, forkJoin, map, of, shareReplay, skip, switchMap, tap } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { PurchaseOrder } from '../../../core/models/purchase-order.model';
import { Supplier } from '../../../core/models/supplier.model';
import { PageRequest } from '../../../core/services/page-params';
import { PaginatedResult, ProductsApiService } from '../../../core/services/products-api.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  PurchasesApiService,
  CreatePurchaseOrderRequest,
  CreateSupplierInvoiceRequest,
  PayPurchaseOrderRequest,
  PurchaseOrderSearchFilters
} from '../../../core/services/purchases-api.service';
import { SuppliersApiService } from '../../../core/services/suppliers-api.service';
import { PurchaseDrawerState, PurchasesVm } from './purchases-vm.model';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';

@Injectable({
  providedIn: 'root'
})
export class PurchasesFacade {
  private readonly purchasesApi = inject(PurchasesApiService);
  private readonly suppliersApi = inject(SuppliersApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  private readonly drawerSubject = new BehaviorSubject<PurchaseDrawerState>({
    opened: false,
    mode: 'CREATE',
    orderId: null
  });

  readonly drawer$ = this.drawerSubject.asObservable();

  private readonly data$ = this.refreshSubject.pipe(
    tap(() => {
      this.isLoadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    switchMap(() =>
      // Fournisseurs et catalogue du backend (sélections du formulaire de commande).
      forkJoin({
        suppliers: this.suppliersApi.list().pipe(map((r) => r.items)),
        products: this.productsApi.list().pipe(map((r) => r.items))
      }).pipe(
        // Une erreur ne coupe pas le flux : message affiché, nouvelle tentative possible.
        catchError((e: unknown) => {
          this.errorSubject.next(e instanceof Error ? e.message : 'Erreur');
          return of({ suppliers: [] as Supplier[], products: [] as Product[] });
        }),
        finalize(() => this.isLoadingSubject.next(false))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Interface seulement : le backend contrôle chaque permission à chaque appel.
  private readonly rights$ = combineLatest([
    this.auth.hasPermission$('purchase:create'),
    this.auth.hasPermission$('purchase:receive'),
    this.auth.hasPermission$('purchase:pay')
  ]);

  /** Rechargements demandés après création, réception ou paiement (liste paginée de l'écran). */
  readonly refresh$ = this.refreshSubject.pipe(skip(1));
  private readonly suppliers$ = this.data$.pipe(map((d) => d.suppliers));
  private readonly products$ = this.data$.pipe(map((d) => d.products));

  readonly vm$: Observable<PurchasesVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.suppliers$,
    this.products$,
    this.rights$
  ]).pipe(
    map(([isLoading, errorMessage, suppliers, products, [canCreate, canReceive, canPay]]): PurchasesVm => ({
      isLoading,
      errorMessage,
      suppliers,
      products,
      canCreate,
      canReceive,
      canPay
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

  /** Page de la liste : recherche, filtres, tri et pagination traités par le backend. */
  search(page: PageRequest, filters: PurchaseOrderSearchFilters): Observable<PaginatedResult<PurchaseOrder>> {
    return this.purchasesApi.findOrdersPage(page, filters);
  }

  openCreate(): void {
    this.drawerSubject.next({ opened: true, mode: 'CREATE', orderId: null });
  }

  openDetail(orderId: string): void {
    this.drawerSubject.next({ opened: true, mode: 'DETAIL', orderId });
  }

  closeDrawer(): void {
    this.drawerSubject.next({ ...this.drawerSubject.value, opened: false });
  }

  createOrder(payload: CreatePurchaseOrderRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.purchasesApi.createOrder(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  receive(orderId: string): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.purchasesApi.receiveOrder(orderId, {}).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  createInvoice(orderId: string, payload: CreateSupplierInvoiceRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.purchasesApi.createInvoice(orderId, payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  payOrder(orderId: string, payload: PayPurchaseOrderRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.purchasesApi.payOrder(orderId, payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }
}
