/** Une entrée par réception (backend) : valeur et quantité reçues. */
export interface SupplierPurchaseHistory {
  id: string;
  supplierId: string;
  purchaseDateIso: string;
  /** Numéro de la réception. */
  reference: string;
  itemsCount: number;
  totalAmount: number;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  /** Dépôt de la réception. */
  warehouseId?: string;
}
