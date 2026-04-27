import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, map, tap } from 'rxjs';

import { Expense } from '../../../core/models/expense.model';
import { CreateExpenseRequest, ExpensesApiService } from '../../../core/services/expenses-api.service';

export interface ExpensesVm {
  isLoading: boolean;
  errorMessage: string | null;
  expenses: Expense[];
  totalExpenses: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExpensesFacade {
  private readonly api = inject(ExpensesApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly expensesSubject = new BehaviorSubject<Expense[]>([]);

  readonly vm$ = combineLatest([this.isLoadingSubject, this.errorSubject, this.expensesSubject]).pipe(
    map(([isLoading, errorMessage, expenses]): ExpensesVm => {
      const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      return { isLoading, errorMessage, expenses, totalExpenses };
    })
  );

  refresh(): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    this.api
      .list()
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe({
        next: (r) => this.expensesSubject.next(r.items),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      });
  }

  create(payload: CreateExpenseRequest): unknown {
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
}
