/** Motif historique du front (correspondance avec les types détaillés côté backend). */
export type StockMovementReason = 'SUPPLY' | 'SALE' | 'LOSS' | 'ADJUSTMENT';

/** Type détaillé du backend (origine réelle du mouvement). */
export type StockMovementType =
  | 'OPENING'
  | 'RECEIPT'
  | 'CUSTOMER_RETURN'
  | 'SALE_CANCELLATION'
  | 'TRANSFER_IN'
  | 'SALE'
  | 'SUPPLIER_RETURN'
  | 'LOSS'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'
  | 'INVENTORY'
  | 'REVERSAL';

export interface StockMovement {
  id: string;
  productId: string;
  /** Variation signée : entrée > 0, sortie < 0. */
  quantity: number;
  reason: StockMovementReason;
  createdAt: string;
  createdByUserId: string;
  note?: string | null;
  // Champs du backend.
  type?: StockMovementType;
  warehouseId?: string;
  productSku?: string;
  productName?: string;
  /** Stock du produit dans le dépôt juste après ce mouvement. */
  balanceAfter?: number;
  unitCost?: number | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  createdByUsername?: string | null;
}
