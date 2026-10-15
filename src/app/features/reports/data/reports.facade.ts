import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, finalize, forkJoin, map, merge, of, shareReplay, skip, switchMap, take, tap } from 'rxjs';

import { SalesGroupBy, SalesPeriodReportRow } from '../../../core/models/report.model';
import { AuthService } from '../../../core/services/auth.service';
import { PageRequest } from '../../../core/services/page-params';
import { PaginatedResult } from '../../../core/services/products-api.service';
import { ReportsApiService } from '../../../core/services/reports-api.service';
import {
  ReportsFilters,
  ReportsKpis,
  ReportsTab,
  ReportsVm,
  SeriesPoint,
  TopProductRow,
  isoDay,
  isoMonth
} from './reports-vm.model';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';

type ReportData = { totals: SalesPeriodReportRow[]; series: SalesPeriodReportRow[] };

const EMPTY: ReportData = { totals: [], series: [] };

/** Bornes demandées au backend pour un onglet. */
interface Period {
  from: string;
  to: string;
  /** Regroupement des totaux : une seule ligne couvrant la période. */
  totalsGroup: SalesGroupBy;
  seriesFrom: string;
  seriesGroup: SalesGroupBy;
}

function periodOf(f: ReportsFilters): Period {
  if (f.tab === 'DAILY') {
    const day = isoDay(f.date);
    const weekStart = new Date(f.date);
    weekStart.setDate(weekStart.getDate() - 6);
    // Série : les 7 derniers jours jusqu'au jour choisi.
    return { from: day, to: day, totalsGroup: 'DAY', seriesFrom: isoDay(weekStart), seriesGroup: 'DAY' };
  }
  if (f.tab === 'MONTHLY') {
    const [y, m] = f.month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const from = `${f.month}-01`;
    return { from, to: `${f.month}-${String(last).padStart(2, '0')}`, totalsGroup: 'MONTH', seriesFrom: from, seriesGroup: 'DAY' };
  }
  const from = `${f.year}-01-01`;
  return { from, to: `${f.year}-12-31`, totalsGroup: 'YEAR', seriesFrom: from, seriesGroup: 'MONTH' };
}

function labelOf(row: SalesPeriodReportRow, group: SalesGroupBy): string {
  const [y, m, d] = row.period.split('-');
  return group === 'MONTH' ? `${m}/${y}` : `${d}/${m}`;
}

/**
 * Rapports : tous les chiffres viennent du backend (`/api/reports/sales/*`, calculés par
 * PostgreSQL, ventes annulées exclues, retours déduits). Le front n'additionne plus de ventes.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportsFacade {
  private readonly api = inject(ReportsApiService);
  private readonly auth = inject(AuthService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  private readonly filtersSubject = new BehaviorSubject<ReportsFilters>({
    tab: 'DAILY',
    date: new Date(),
    month: isoMonth(new Date()),
    year: new Date().getFullYear()
  });

  private readonly data$: Observable<ReportData> = combineLatest([
    this.refreshSubject,
    this.filtersSubject,
    this.auth.hasPermission$('report:read')
  ]).pipe(
    switchMap(([, filters, canRead]) => {
      if (!canRead) {
        this.errorSubject.next('Permission report:read requise pour consulter les rapports.');
        return of(EMPTY);
      }
      const p = periodOf(filters);
      this.isLoadingSubject.next(true);
      this.errorSubject.next(null);
      return forkJoin({
        totals: this.api.salesByPeriod(p.from, p.to, p.totalsGroup),
        series: this.api.salesByPeriod(p.seriesFrom, p.to, p.seriesGroup)
      }).pipe(
        catchError((e: unknown) => {
          this.errorSubject.next(e instanceof Error ? e.message : 'Erreur');
          return of(EMPTY);
        }),
        finalize(() => this.isLoadingSubject.next(false))
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$: Observable<ReportsVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.filtersSubject,
    this.data$
  ]).pipe(
    map(([isLoading, errorMessage, filters, data]): ReportsVm => {
      const group = periodOf(filters).seriesGroup;
      return {
        isLoading,
        errorMessage,
        filters,
        kpis: this.kpisOf(data.totals),
        salesSeries: data.series.map((r): SeriesPoint => ({ label: labelOf(r, group), value: r.netSales })),
        profitSeries: data.series.map((r): SeriesPoint => ({ label: labelOf(r, group), value: r.profit }))
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Période ou onglet changé, ou actualisation : la liste paginée des produits est rechargée. */
  readonly topProductsReload$ = merge(this.refreshSubject.pipe(skip(1)), this.filtersSubject.pipe(skip(1)));

  constructor() {
    // Autre dépôt : données rechargées (sans abonné, le prochain affichage les recharge de toute façon).
    inject(WarehouseContextService).warehouseChanged$.subscribe(() => this.refresh());
  }

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  /** Produits vendus sur la période affichée : recherche, tri et pagination traités par le backend. */
  topProducts(page: PageRequest): Observable<PaginatedResult<TopProductRow>> {
    return this.auth.hasPermission$('report:read').pipe(
      take(1),
      switchMap((canRead) => {
        if (!canRead) return of({ items: [] as TopProductRow[], total: 0 });
        const p = periodOf(this.filtersSubject.value);
        return this.api.salesByProductPage(p.from, p.to, page).pipe(
          map((r) => ({
            total: r.total,
            items: r.items.map(
              (row): TopProductRow => ({
                productId: row.productId,
                sku: row.sku,
                name: row.name,
                quantity: row.netQuantity,
                total: row.netRevenue,
                profit: row.profit
              })
            )
          }))
        );
      })
    );
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

  /** Totaux de la période : ligne unique renvoyée par le backend (regroupement = période entière). */
  private kpisOf(rows: SalesPeriodReportRow[]): ReportsKpis {
    const row = rows[0];
    return {
      totalSales: row?.netSales ?? 0,
      profit: row?.profit ?? 0,
      transactionsCount: row?.count ?? 0,
      returns: row?.returns ?? 0
    };
  }
}
