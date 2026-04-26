import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, map, switchMap, tap } from 'rxjs';

import { Supplier } from '../../../core/models/supplier.model';
import { CreateSupplierRequest, SuppliersApiService, UpdateSupplierRequest } from '../../../core/services/suppliers-api.service';
import { SupplierDrawerState, SuppliersVm } from './suppliers-vm.model';

@Injectable({
  providedIn: 'root'
})
export class SuppliersFacade {
  private readonly api = inject(SuppliersApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);
  private readonly filterSubject = new BehaviorSubject<string>('');

  private readonly drawerSubject = new BehaviorSubject<SupplierDrawerState>({
    opened: false,
    mode: 'CREATE',
    supplierId: null
  });

  readonly drawer$ = this.drawerSubject.asObservable();

  private readonly suppliers$ = this.refreshSubject.pipe(
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

  readonly vm$ = combineLatest([this.isLoadingSubject, this.errorSubject, this.suppliers$, this.filterSubject]).pipe(
    map(([isLoading, errorMessage, suppliers, filter]): SuppliersVm => ({
      isLoading,
      errorMessage,
      suppliers,
      filter
    }))
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  setFilter(v: string): void {
    this.filterSubject.next(v);
  }

  openCreate(): void {
    this.drawerSubject.next({ opened: true, mode: 'CREATE', supplierId: null });
  }

  openEdit(supplierId: string): void {
    this.drawerSubject.next({ opened: true, mode: 'EDIT', supplierId });
  }

  closeDrawer(): void {
    this.drawerSubject.next({ ...this.drawerSubject.value, opened: false });
  }

  create(payload: CreateSupplierRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.create(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  update(id: string, payload: UpdateSupplierRequest): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.update(id, payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  delete(id: string): unknown {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.api.delete(id).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: () => this.refresh(),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  findSupplier(items: readonly Supplier[], id: string | null): Supplier | null {
    if (!id) return null;
    return items.find((s) => s.id === id) ?? null;
  }
}
