import { Product } from '../../../core/models/product.model';
import { StockMovement, StockMovementReason, StockMovementType } from '../../../core/models/stock-movement.model';

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
  /** Types détaillés du backend ; vide : tous. */
  types?: StockMovementType[] | null;
}

export interface StockVm {
  isLoading: boolean;
  errorMessage: string | null;
  products: Product[];
  /** Permission stock:adjust (interface seulement). */
  canAdjust: boolean;
}

export interface StockDrawerState {
  opened: boolean;
}

/** Origine réelle du mouvement (type détaillé du backend). */
export const stockTypeLabels: Record<StockMovementType, string> = {
  OPENING: 'Stock initial',
  RECEIPT: 'Réception',
  CUSTOMER_RETURN: 'Retour client',
  SALE_CANCELLATION: 'Annulation de vente',
  TRANSFER_IN: 'Transfert (entrée)',
  SALE: 'Vente',
  SUPPLIER_RETURN: 'Retour fournisseur',
  LOSS: 'Perte',
  TRANSFER_OUT: 'Transfert (sortie)',
  ADJUSTMENT: 'Ajustement',
  INVENTORY: 'Inventaire',
  REVERSAL: 'Contre-passation'
};

export const stockReasonLabels: Record<StockMovementReason, string> = {
  SUPPLY: 'Entrée',
  SALE: 'Sortie (vente)',
  LOSS: 'Sortie (perte)',
  ADJUSTMENT: 'Ajustement'
};
