import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { PurchaseOrder } from '../../../core/models/purchase-order.model';
import { Supplier } from '../../../core/models/supplier.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import {
  PurchasesApiService,
  CreatePurchaseOrderRequest,
  CreateSupplierInvoiceRequest,
  PayPurchaseOrderRequest
} from '../../../core/services/purchases-api.service';
import { SuppliersApiService } from '../../../core/services/suppliers-api.service';
import { PurchaseDrawerState, PurchasesVm } from './purchases-vm.model';

@Injectable({
  providedIn: 'root'
})
export class PurchasesFacade {
  private readonly purchasesApi = inject(PurchasesApiService);
  private readonly suppliersApi = inject(SuppliersApiService);
  private readonly productsApi = inject(ProductsApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);
  private readonly filterSubject = new BehaviorSubject<string>('');

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
      forkJoin({
        orders: this.purchasesApi.listOrders().pipe(map((r) => r.items)),
        suppliers: this.suppliersApi.list().pipe(map((r) => r.items)),
        products: this.productsApi.list().pipe(map((r) => r.items))
      }).pipe(
        tap({
          error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
        }),
        finalize(() => this.isLoadingSubject.next(false))
      )
    ),
    switchMap((v) => (this.errorSubject.value ? of({ orders: [] as PurchaseOrder[], suppliers: [] as Supplier[], products: [] as Product[] }) : of(v))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly orders$ = this.data$.pipe(map((d) => d.orders));
  private readonly suppliers$ = this.data$.pipe(map((d) => d.suppliers));
  private readonly products$ = this.data$.pipe(map((d) => d.products));

  readonly vm$ = combineLatest([this.isLoadingSubject, this.errorSubject, this.orders$, this.suppliers$, this.products$, this.filterSubject]).pipe(
    map(([isLoading, errorMessage, orders, suppliers, products, filter]): PurchasesVm => ({
      isLoading,
      errorMessage,
      orders,
      suppliers,
      products,
      filter
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  setFilter(v: string): void {
    this.filterSubject.next(v);
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
