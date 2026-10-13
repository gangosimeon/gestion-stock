import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest, finalize, map, shareReplay, tap } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { AuthService } from '../../../core/services/auth.service';
import {
  CreateCustomerRequest,
  CustomerSearchFilters,
  CustomersApiService,
  UpdateCustomerRequest
} from '../../../core/services/customers-api.service';
import { PageRequest } from '../../../core/services/page-params';
import { PaginatedResult } from '../../../core/services/products-api.service';
import { ClientDrawerState, ClientsVm } from './clients-vm.model';

@Injectable({
  providedIn: 'root'
})
export class ClientsFacade {
  private readonly api = inject(CustomersApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new Subject<void>();
  private readonly drawerSubject = new BehaviorSubject<ClientDrawerState>({ opened: false });

  // Interface seulement : le backend contrôle chaque permission à chaque appel.
  private readonly rights$ = combineLatest([
    this.auth.hasPermission$('customer:create'),
    this.auth.hasPermission$('customer:update'),
    this.auth.hasPermission$('customer:delete'),
    this.auth.hasPermission$('customer:credit')
  ]);

  readonly vm$: Observable<ClientsVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.drawerSubject,
    this.rights$
  ]).pipe(
    map(([isLoading, errorMessage, drawer, [canCreate, canUpdate, canDelete, canCredit]]): ClientsVm => ({
      isLoading,
      errorMessage,
      drawer,
      canCreate,
      canUpdate,
      canDelete,
      canCredit
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Rechargements demandés après création, modification ou suppression (liste paginée de l'écran). */
  readonly refresh$ = this.refreshSubject.asObservable();

  refresh(): void {
    this.refreshSubject.next();
  }

  /** Page de la liste : recherche, filtres, tri et pagination traités par le backend. */
  search(page: PageRequest, filters: CustomerSearchFilters): Observable<PaginatedResult<Customer>> {
    return this.api.findPage(page, filters);
  }

  openCreate(): void {
    this.drawerSubject.next({ opened: true, mode: 'CREATE', customerId: null });
  }

  openEdit(customerId: string): void {
    this.drawerSubject.next({ opened: true, mode: 'EDIT', customerId });
  }

  closeDrawer(): void {
    this.drawerSubject.next({ opened: false });
  }

  create(payload: CreateCustomerRequest): Observable<Customer> {
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

  update(id: string, payload: UpdateCustomerRequest): Observable<Customer> {
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

  delete(id: string): Observable<unknown> {
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
}
