import { Product } from '../../../core/models/product.model';
import { StockMovement, StockMovementReason } from '../../../core/models/stock-movement.model';

export type StockMovementUiType = 'IN' | 'OUT';

export interface StockMovementRow extends StockMovement {
  productName?: string;
  sku?: string;
  uiType: StockMovementUiType;
}

export interface StockFilters {
  from: Date | null;
  to: Date | null;
  productId: string | null;
}

export interface StockVm {
  isLoading: boolean;
  errorMessage: string | null;
  products: Product[];
  movements: StockMovementRow[];
  filters: StockFilters;
}

export interface StockDrawerState {
  opened: boolean;
}

export const stockReasonLabels: Record<StockMovementReason, string> = {
  SUPPLY: 'Entrée',
  SALE: 'Sortie (vente)',
  LOSS: 'Sortie (perte)',
  ADJUSTMENT: 'Ajustement'
};
