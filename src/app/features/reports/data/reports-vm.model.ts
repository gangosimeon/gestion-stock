export type ReportsTab = 'DAILY' | 'MONTHLY' | 'YEARLY';

export interface ReportsFilters {
  tab: ReportsTab;
  date: Date;
  month: string; // YYYY-MM
  year: number;
  /** Tous les dépôts fusionnés (warehouse:all) au lieu du dépôt courant. */
  allWarehouses: boolean;
}

/** Totaux de la période, calculés par le backend. */
export interface ReportsKpis {
  /** CA net (ventes validées − retours). */
  totalSales: number;
  /** Marge brute. */
  profit: number;
  /** Nombre de ventes validées. */
  transactionsCount: number;
  /** Retours clients de la période. */
  returns: number;
}

/** Meilleures ventes par produit (backend, nettes des retours). */
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
