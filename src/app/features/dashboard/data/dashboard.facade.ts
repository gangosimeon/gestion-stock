import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, finalize, map } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { Sale } from '../../../core/models/sale.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { SalesApiService } from '../../../core/services/sales-api.service';

export interface SalesByDayPoint {
  date: string; // yyyy-mm-dd
  total: number;
  profit: number;
}

export interface TopProductPoint {
  productId: string;
  name: string;
  quantity: number;
  total: number;
}

export interface StockEvolutionPoint {
  label: string;
  stockTotal: number;
}

export interface DashboardKpis {
  todaySalesTotal: number;
  todayProfit: number;
  stockTotal: number;
}

export interface DashboardVm {
  isLoading: boolean;
  errorMessage: string | null;
  kpis: DashboardKpis;
  salesByDay: SalesByDayPoint[];
  topProducts: TopProductPoint[];
  stockEvolution: StockEvolutionPoint[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardFacade {
  private readonly productsApi = inject(ProductsApiService);
  private readonly salesApi = inject(SalesApiService);

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  private readonly productsSubject = new BehaviorSubject<Product[]>([]);
  private readonly salesSubject = new BehaviorSubject<Sale[]>([]);

  readonly vm$ = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.productsSubject,
    this.salesSubject
  ]).pipe(
    map(([isLoading, errorMessage, products, sales]): DashboardVm => {
      const kpis = this.computeKpis(products, sales);
      const salesByDay = this.computeSalesByDay(sales);
      const topProducts = this.computeTopProducts(products, sales);
      const stockEvolution = this.computeStockEvolution(products);

      return {
        isLoading,
        errorMessage,
        kpis,
        salesByDay,
        topProducts,
        stockEvolution
      };
    })
  );

  refresh(): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    combineLatest([this.productsApi.list(), this.salesApi.list()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe({
        next: ([p, s]) => {
          this.productsSubject.next(p.items);
          this.salesSubject.next(s.items);
        },
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      });
  }

  private computeKpis(products: Product[], sales: Sale[]): DashboardKpis {
    const stockTotal = products.reduce((acc, p) => acc + p.stockQuantity, 0);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayKey = `${yyyy}-${mm}-${dd}`;

    const todaySales = sales.filter((s) => s.createdAt.slice(0, 10) === todayKey);
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);
    const todayProfit = todaySales.reduce((acc, s) => acc + s.profit, 0);

    return { todaySalesTotal, todayProfit, stockTotal };
  }

  private computeSalesByDay(sales: Sale[]): SalesByDayPoint[] {
    const byDay = new Map<string, { total: number; profit: number }>();

    for (const s of sales) {
      const key = s.createdAt.slice(0, 10);
      const prev = byDay.get(key) ?? { total: 0, profit: 0 };
      byDay.set(key, { total: prev.total + s.total, profit: prev.profit + s.profit });
    }

    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, v]) => ({ date, total: v.total, profit: v.profit }));
  }

  private computeTopProducts(products: Product[], sales: Sale[]): TopProductPoint[] {
    const pById = new Map(products.map((p) => [p.id, p] as const));
    const agg = new Map<string, { quantity: number; total: number }>();

    for (const s of sales) {
      for (const it of s.items) {
        const prev = agg.get(it.productId) ?? { quantity: 0, total: 0 };
        agg.set(it.productId, {
          quantity: prev.quantity + it.quantity,
          total: prev.total + it.unitPrice * it.quantity
        });
      }
    }

    return [...agg.entries()]
      .map(([productId, v]) => {
        const p = pById.get(productId);
        return {
          productId,
          name: p?.name ?? productId,
          quantity: v.quantity,
          total: v.total
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }

  private computeStockEvolution(products: Product[]): StockEvolutionPoint[] {
    // Sans backend historique, on génère une tendance simple basée sur stock actuel.
    const stockTotal = products.reduce((acc, p) => acc + p.stockQuantity, 0);

    const points: StockEvolutionPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600_000);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const factor = 1 - i * 0.02;
      points.push({ label, stockTotal: Math.max(0, Math.round(stockTotal * factor)) });
    }

    return points;
  }
}
