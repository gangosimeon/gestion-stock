import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, combineLatest, finalize, forkJoin, map, shareReplay, tap } from 'rxjs';

import { Expense, ExpenseFilter, ExpenseSummary } from '../../../core/models/expense.model';
import { AuthService } from '../../../core/services/auth.service';
import { CreateExpenseRequest, ExpensesApiService } from '../../../core/services/expenses-api.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';

export interface ExpensesVm {
  isLoading: boolean;
  errorMessage: string | null;
  filter: ExpenseFilter;
  expenses: Expense[];
  /** Nombre de dépenses correspondant aux critères (toutes pages). */
  total: number;
  pageIndex: number;
  pageSize: number;
  /** Totaux calculés par le backend (dépenses payées seulement). */
  summary: ExpenseSummary | null;
  canCreate: boolean;
  canCancel: boolean;
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Période par défaut : le mois en cours. */
export function currentMonthFilter(today = new Date()): ExpenseFilter {
  return { dateFrom: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: isoDate(today) };
}

@Injectable({
  providedIn: 'root'
})
export class ExpensesFacade {
  private readonly api = inject(ExpensesApiService);
  private readonly auth = inject(AuthService);
  private readonly warehouseCtx = inject(WarehouseContextService);

  private loading?: Subscription;

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly filterSubject = new BehaviorSubject<ExpenseFilter>(currentMonthFilter());
  private readonly pageSubject = new BehaviorSubject<{ index: number; size: number }>({ index: 0, size: 10 });
  private readonly resultSubject = new BehaviorSubject<{ expenses: Expense[]; total: number; summary: ExpenseSummary | null }>({
    expenses: [],
    total: 0,
    summary: null
  });

  // Interface seulement : le backend contrôle chaque permission à chaque appel.
  private readonly rights$ = combineLatest([this.auth.hasPermission$('expense:create'), this.auth.hasPermission$('expense:delete')]);

  readonly vm$: Observable<ExpensesVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.filterSubject,
    this.pageSubject,
    this.resultSubject,
    this.rights$
  ]).pipe(
    map(([isLoading, errorMessage, filter, page, result, [canCreate, canCancel]]): ExpensesVm => ({
      isLoading,
      errorMessage,
      filter,
      expenses: result.expenses,
      total: result.total,
      pageIndex: page.index,
      pageSize: page.size,
      summary: result.summary,
      canCreate,
      canCancel
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    // Autre dépôt : ses dépenses repartent de la première page, rien du précédent ne reste affiché.
    this.warehouseCtx.warehouseChanged$.subscribe(() => {
      this.loading?.unsubscribe();
      this.isLoadingSubject.next(false);
      this.pageSubject.next({ ...this.pageSubject.value, index: 0 });
      this.resultSubject.next({ expenses: [], total: 0, summary: null });
    });
  }

  /** Liste et totaux du même filtre, chargés ensemble. */
  refresh(): void {
    const filter = this.filterSubject.value;
    const page = this.pageSubject.value;
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // Un chargement plus ancien (autre filtre, autre dépôt) est abandonné.
    this.loading?.unsubscribe();
    this.loading = forkJoin({ list: this.api.list(filter, page.index, page.size), summary: this.api.summary(filter) })
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe({
        next: ({ list, summary }) => this.resultSubject.next({ expenses: list.items, total: list.total, summary }),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      });
  }

  applyFilter(filter: ExpenseFilter): void {
    this.filterSubject.next(filter);
    this.pageSubject.next({ ...this.pageSubject.value, index: 0 });
    this.refresh();
  }

  changePage(index: number, size: number): void {
    this.pageSubject.next({ index, size });
    this.refresh();
  }

  create(payload: CreateExpenseRequest): Observable<Expense> {
    this.errorSubject.next(null);
    return this.api.create(payload).pipe(tap(() => this.refresh()));
  }

  cancel(id: string, reason: string): Observable<Expense> {
    this.errorSubject.next(null);
    return this.api.cancel(id, reason).pipe(tap(() => this.refresh()));
  }
}
