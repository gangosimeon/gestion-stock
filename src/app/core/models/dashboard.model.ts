// Tableau de bord servi par le backend (GET /api/dashboard) : chiffres calculés sur la base,
// jamais estimés côté client. Règles de calcul : gestionStock-backend/docs/dashboard.md.

export interface DashboardKpis {
  /** Chiffre d'affaires net du jour (ventes validées − retours). */
  todaySalesTotal: number;
  /** Marge brute du jour (CA net − coût des ventes). */
  todayProfit: number;
  /** Quantités en stock (dépôt courant). */
  stockTotal: number;
}

export interface SalesByDayPoint {
  date: string; // yyyy-mm-dd
  count: number;
  grossSales: number;
  returns: number;
  /** CA net du jour. */
  total: number;
  /** Marge brute du jour. */
  profit: number;
}

export interface TopProductPoint {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  /** CA net du produit. */
  total: number;
  profit: number;
}

export interface StockEvolutionPoint {
  date: string; // yyyy-mm-dd
  label: string; // dd/MM
  /** Stock en fin de journée, reconstitué depuis les mouvements. */
  stockTotal: number;
}

export interface Dashboard {
  generatedAt: string;
  warehouseId: string | null;
  kpis: DashboardKpis;
  salesByDay: SalesByDayPoint[];
  topProducts: TopProductPoint[];
  stockEvolution: StockEvolutionPoint[];
}

/** Journée du vendeur connecté (GET /api/dashboard/me) : ses ventes du jour, sans marge. */
export interface MyDay {
  date: string;
  salesCount: number;
  salesTotal: number;
  paidAmount: number;
  creditAmount: number;
  cancelledCount: number;
  lastSaleAt: string | null;
  /** Ses ventes validées des 7 derniers jours (aujourd'hui en dernier), jours sans vente à 0. */
  last7Days: SellerDayPoint[];
}

export interface SellerDayPoint {
  date: string;
  label: string;
  count: number;
  total: number;
}
