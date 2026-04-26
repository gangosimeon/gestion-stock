import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { Sale } from '../../../core/models/sale.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { SalesApiService } from '../../../core/services/sales-api.service';
import {
  ReportsFilters,
  ReportsTab,
  ReportsVm,
  computeKpis,
  computeTopProducts,
  isoDay,
  isoMonth
} from './reports-vm.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsFacade {
  private readonly salesApi = inject(SalesApiService);
  private readonly productsApi = inject(ProductsApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  private readonly filtersSubject = new BehaviorSubject<ReportsFilters>({
    tab: 'DAILY',
    date: new Date(),
    month: isoMonth(new Date()),
    year: new Date().getFullYear()
  });

  private readonly data$ = this.refreshSubject.pipe(
    tap(() => {
      this.isLoadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    switchMap(() =>
      forkJoin({
        products: this.productsApi.list().pipe(map((r) => r.items)),
        sales: this.salesApi.list().pipe(map((r) => r.items))
      }).pipe(
        tap({
          error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
        }),
        finalize(() => this.isLoadingSubject.next(false))
      )
    ),
    switchMap((v) => (this.errorSubject.value ? of({ products: [] as Product[], sales: [] as Sale[] }) : of(v))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly products$ = this.data$.pipe(map((d) => d.products));
  private readonly sales$ = this.data$.pipe(map((d) => d.sales));

  readonly vm$ = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.filtersSubject,
    this.products$,
    this.sales$
  ]).pipe(
    map(([isLoading, errorMessage, filters, products, sales]): ReportsVm => {
      const filteredSales = this.filterSales(filters, sales);
      const kpis = computeKpis(filteredSales);
      const topProducts = computeTopProducts(products, filteredSales);

      const { salesSeries, profitSeries } = this.computeSeries(filters, filteredSales);

      return {
        isLoading,
        errorMessage,
        filters,
        kpis,
        topProducts,
        salesSeries,
        profitSeries
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  setTab(tab: ReportsTab): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({ ...current, tab });
  }

  setDate(date: Date): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({ ...current, date, month: isoMonth(date), year: date.getFullYear() });
  }

  setMonth(month: string): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({ ...current, month });
  }

  setYear(year: number): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({ ...current, year });
  }

  private filterSales(filters: ReportsFilters, sales: Sale[]): Sale[] {
    if (filters.tab === 'DAILY') {
      const day = isoDay(filters.date);
      return sales.filter((s) => s.createdAt.slice(0, 10) === day);
    }

    if (filters.tab === 'MONTHLY') {
      return sales.filter((s) => s.createdAt.slice(0, 7) === filters.month);
    }

    return sales.filter((s) => Number(s.createdAt.slice(0, 4)) === filters.year);
  }

  private computeSeries(filters: ReportsFilters, sales: Sale[]): {
    salesSeries: { label: string; value: number }[];
    profitSeries: { label: string; value: number }[];
  } {
    const byLabel = new Map<string, { total: number; profit: number }>();

    for (const s of sales) {
      const label =
        filters.tab === 'YEARLY'
          ? s.createdAt.slice(0, 7)
          : filters.tab === 'MONTHLY'
            ? s.createdAt.slice(8, 10)
            : s.createdAt.slice(11, 13);

      const prev = byLabel.get(label) ?? { total: 0, profit: 0 };
      byLabel.set(label, { total: prev.total + s.total, profit: prev.profit + s.profit });
    }

    const entries = [...byLabel.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    return {
      salesSeries: entries.map(([label, v]) => ({ label, value: v.total })),
      profitSeries: entries.map(([label, v]) => ({ label, value: v.profit }))
    };
  }
}
