export interface SupplierPurchaseHistory {
  id: string;
  supplierId: string;
  purchaseDateIso: string;
  reference: string;
  itemsCount: number;
  totalAmount: number;
}
