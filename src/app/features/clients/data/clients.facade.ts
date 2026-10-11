import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, finalize, map, shareReplay, tap } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { AuthService } from '../../../core/services/auth.service';
import {
  CreateCustomerRequest,
  CustomersApiService,
  UpdateCustomerRequest
} from '../../../core/services/customers-api.service';
import { ClientDrawerState, ClientsVm } from './clients-vm.model';

@Injectable({
  providedIn: 'root'
})
export class ClientsFacade {
  private readonly api = inject(CustomersApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly customersSubject = new BehaviorSubject<Customer[]>([]);
  private readonly filterSubject = new BehaviorSubject<string>('');
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
    this.customersSubject,
    this.filterSubject,
    this.drawerSubject,
    this.rights$
  ]).pipe(
    map(([isLoading, errorMessage, customers, filter, drawer, [canCreate, canUpdate, canDelete, canCredit]]): ClientsVm => ({
      isLoading,
      errorMessage,
      customers,
      filter,
      drawer,
      canCreate,
      canUpdate,
      canDelete,
      canCredit
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    this.api
      .list()
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe({
        next: (r) => this.customersSubject.next(r.items),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      });
  }

  setFilter(filter: string): void {
    this.filterSubject.next(filter);
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
