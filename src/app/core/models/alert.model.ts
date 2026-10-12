/** Alertes calculées par le backend (GET /api/alerts). Types utilisés par le front. */
export type StockAlertType = 'OUT_OF_STOCK' | 'BELOW_MINIMUM' | 'LOW_STOCK';

export interface Alert {
  id: string;
  type: string;
  category: string;
  severity: string;
  title: string;
  message: string;
  warehouseId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  value?: number | null;
  threshold?: number | null;
}

/** Synthèse des alertes (GET /api/alerts/summary). */
export interface AlertSummary {
  total: number;
  stockAlertsCount: number;
}
