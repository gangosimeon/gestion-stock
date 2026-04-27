export interface InventoryLine {
  productId: string;
  productSku: string;
  productName: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
}

export interface InventorySession {
  id: string;
  createdAt: string;
  createdByUserId: string;
  note?: string;
  lines: InventoryLine[];
  itemsCount: number;
  totalDifference: number;
}
