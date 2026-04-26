export type StockMovementReason = 'SUPPLY' | 'SALE' | 'LOSS' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  reason: StockMovementReason;
  createdAt: string;
  createdByUserId: string;
  note?: string;
}
