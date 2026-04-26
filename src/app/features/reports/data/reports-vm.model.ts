import { Product } from '../../../core/models/product.model';
import { Sale } from '../../../core/models/sale.model';

export type ReportsTab = 'DAILY' | 'MONTHLY' | 'YEARLY';

export interface ReportsFilters {
  tab: ReportsTab;
  date: Date;
  month: string; // YYYY-MM
  year: number;
}

export interface ReportsKpis {
  totalSales: number;
  profit: number;
  transactionsCount: number;
}

export interface TopProductRow {
  productId: string;
  sku?: string;
  name: string;
  quantity: number;
  total: number;
  profit: number;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface ReportsVm {
  isLoading: boolean;
  errorMessage: string | null;
  filters: ReportsFilters;
  kpis: ReportsKpis;
  topProducts: TopProductRow[];
  salesSeries: SeriesPoint[];
  profitSeries: SeriesPoint[];
}

export function isoDay(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isoMonth(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export function computeKpis(sales: Sale[]): ReportsKpis {
  return {
    totalSales: sales.reduce((a, s) => a + s.total, 0),
    profit: sales.reduce((a, s) => a + s.profit, 0),
    transactionsCount: sales.length
  };
}

export function computeTopProducts(products: Product[], sales: Sale[]): TopProductRow[] {
  const pById = new Map(products.map((p) => [p.id, p] as const));
  const agg = new Map<string, { quantity: number; total: number; profit: number }>();

  for (const s of sales) {
    for (const it of s.items) {
      const prev = agg.get(it.productId) ?? { quantity: 0, total: 0, profit: 0 };
      agg.set(it.productId, {
        quantity: prev.quantity + it.quantity,
        total: prev.total + it.unitPrice * it.quantity,
        profit: prev.profit + (it.unitPrice - it.purchasePrice) * it.quantity
      });
    }
  }

  return [...agg.entries()]
    .map(([productId, v]) => {
      const p = pById.get(productId);
      return {
        productId,
        sku: p?.sku,
        name: p?.name ?? productId,
        quantity: v.quantity,
        total: v.total,
        profit: v.profit
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}
