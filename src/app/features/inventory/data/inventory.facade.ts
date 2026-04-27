import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, map, shareReplay, switchMap, tap } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { InventorySession } from '../../../core/models/inventory.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { CreateInventorySessionRequest, InventoryApiService } from '../../../core/services/inventory-api.service';

export interface InventoryVm {
  isLoading: boolean;
  errorMessage: string | null;
  products: Product[];
}

@Injectable({
  providedIn: 'root'
})
export class InventoryFacade {
  private readonly productsApi = inject(ProductsApiService);
  private readonly inventoryApi = inject(InventoryApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  private readonly products$ = this.refreshSubject.pipe(
    switchMap(() => this.productsApi.list()),
    map((r) => r.items),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$ = combineLatest([this.isLoadingSubject, this.errorSubject, this.products$]).pipe(
    map(([isLoading, errorMessage, products]): InventoryVm => ({ isLoading, errorMessage, products })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    this.productsApi
      .list()
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe({
        next: () => this.refreshSubject.next(undefined),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      });
  }

  createSession(payload: CreateInventorySessionRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.inventoryApi.createSession(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refreshSubject.next(undefined),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  listSessions(): unknown {
    return this.inventoryApi.listSessions();
  }

  getSessionById(id: string): unknown {
    return this.inventoryApi.getSessionById(id);
  }
}
