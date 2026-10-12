import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, finalize, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { ProductSalesReportRow, SalesGroupBy, SalesPeriodReportRow } from '../../../core/models/report.model';
import { AuthService } from '../../../core/services/auth.service';
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

type ReportData = { totals: SalesPeriodReportRow[]; series: SalesPeriodReportRow[]; top: ProductSalesReportRow[] };

const EMPTY: ReportData = { totals: [], series: [], top: [] };

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
        series: this.api.salesByPeriod(p.seriesFrom, p.to, p.seriesGroup),
        top: this.api.salesByProduct(p.from, p.to).pipe(map((r) => r.items))
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
        topProducts: data.top.map(
          (r): TopProductRow => ({
            productId: r.productId,
            sku: r.sku,
            name: r.name,
            quantity: r.netQuantity,
            total: r.netRevenue,
            profit: r.profit
          })
        ),
        salesSeries: data.series.map((r): SeriesPoint => ({ label: labelOf(r, group), value: r.netSales })),
        profitSeries: data.series.map((r): SeriesPoint => ({ label: labelOf(r, group), value: r.profit }))
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
