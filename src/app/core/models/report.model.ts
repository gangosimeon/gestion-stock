/** Point d'une série de ventes (GET /api/reports/sales/by-period), calculé par PostgreSQL. */
export interface SalesPeriodReportRow {
  /** Premier jour de la période (AAAA-MM-JJ). */
  period: string;
  /** Nombre de ventes validées. */
  count: number;
  grossSales: number;
  /** Retours clients de la période. */
  returns: number;
  /** CA net = brut − retours. */
  netSales: number;
  cost: number;
  /** Marge brute (coût figé à la vente). */
  profit: number;
}

/** Ventes d'un produit sur la période (GET /api/reports/sales/by-product), nettes des retours. */
export interface ProductSalesReportRow {
  productId: string;
  sku: string;
  name: string;
  categoryName?: string | null;
  soldQuantity: number;
  returnedQuantity: number;
  netQuantity: number;
  revenue: number;
  returns: number;
  netRevenue: number;
  cost: number;
  profit: number;
  marginRate?: number | null;
}

/** Rapport paginé : `summary` porte sur tout le filtre, pas seulement la page. */
export interface ReportPage<T, S = unknown> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  summary: S;
}

export type SalesGroupBy = 'DAY' | 'MONTH' | 'YEAR';
