import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { Supplier } from '../../../core/models/supplier.model';
import { AuthService } from '../../../core/services/auth.service';
import { CreateSupplierRequest, SuppliersApiService, UpdateSupplierRequest } from '../../../core/services/suppliers-api.service';
import { SupplierDrawerState, SuppliersVm } from './suppliers-vm.model';

@Injectable({
  providedIn: 'root'
})
export class SuppliersFacade {
  private readonly api = inject(SuppliersApiService);
  private readonly auth = inject(AuthService);

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
        catchError((e: unknown) => {
          this.errorSubject.next(e instanceof Error ? e.message : 'Erreur de chargement');
          return of([] as Supplier[]);
        }),
        finalize(() => this.isLoadingSubject.next(false))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Interface seulement : le backend contrôle supplier:create / update / delete à chaque appel.
  private readonly rights$ = combineLatest([
    this.auth.hasPermission$('supplier:create'),
    this.auth.hasPermission$('supplier:update'),
    this.auth.hasPermission$('supplier:delete')
  ]);

  readonly vm$: Observable<SuppliersVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.suppliers$,
    this.filterSubject,
    this.rights$
  ]).pipe(
    map(([isLoading, errorMessage, suppliers, filter, [canCreate, canUpdate, canDelete]]): SuppliersVm => ({
      isLoading,
      errorMessage,
      suppliers,
      filter,
      canCreate,
      canUpdate,
      canDelete
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
