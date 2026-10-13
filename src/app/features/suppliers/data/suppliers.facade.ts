import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest, finalize, map, shareReplay, tap } from 'rxjs';

import { Supplier } from '../../../core/models/supplier.model';
import { AuthService } from '../../../core/services/auth.service';
import { PageRequest } from '../../../core/services/page-params';
import { ActiveStatusFilter, PaginatedResult } from '../../../core/services/products-api.service';
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
  private readonly refreshSubject = new Subject<void>();

  private readonly drawerSubject = new BehaviorSubject<SupplierDrawerState>({
    opened: false,
    mode: 'CREATE',
    supplierId: null
  });

  readonly drawer$ = this.drawerSubject.asObservable();

  /** Rechargements demandés après création, modification ou suppression (liste paginée de l'écran). */
  readonly refresh$ = this.refreshSubject.asObservable();

  // Interface seulement : le backend contrôle supplier:create / update / delete à chaque appel.
  private readonly rights$ = combineLatest([
    this.auth.hasPermission$('supplier:create'),
    this.auth.hasPermission$('supplier:update'),
    this.auth.hasPermission$('supplier:delete')
  ]);

  readonly vm$: Observable<SuppliersVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.rights$
  ]).pipe(
    map(([isLoading, errorMessage, [canCreate, canUpdate, canDelete]]): SuppliersVm => ({
      isLoading,
      errorMessage,
      canCreate,
      canUpdate,
      canDelete
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.refreshSubject.next();
  }

  /** Page de la liste : recherche, filtres, tri et pagination traités par le backend. */
  search(page: PageRequest, filters: { status: ActiveStatusFilter }): Observable<PaginatedResult<Supplier>> {
    return this.api.findPage(page, filters);
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
