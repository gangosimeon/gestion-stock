/** Statut historique : en attente (rien ou une partie reçue), livrée (reçue ou soldée), annulée. */
export type PurchaseOrderStatus = 'PENDING' | 'DELIVERED' | 'CANCELLED';

/** Statut détaillé du backend. */
export type PurchaseOrderDocumentStatus = 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';

export interface PurchaseOrderLine {
  productId: string;
  productSku: string;
  productName: string;
  /** Quantité commandée. */
  quantity: number;
  unitPurchasePrice: number;
  lineTotal: number;
  receivedQuantity?: number;
  remainingQuantity?: number;
}

export interface SupplierInvoice {
  invoiceNumber: string;
  invoiceDateIso: string;
  /** Montant facturé : valeur reçue, calculée par le backend. */
  totalAmount: number;
  purchaseOrderId?: string;
  supplierId?: string;
  invoicedAt?: string;
  invoicedByUserId?: string | null;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  deliveredAt?: string | null;
  lines: PurchaseOrderLine[];
  totalAmount: number;
  paidAmount: number;
  invoice?: SupplierInvoice | null;
  // Champs du backend.
  /** Numéro lisible CMD-AAAA-nnnnnn. */
  number?: string;
  documentStatus?: PurchaseOrderDocumentStatus;
  warehouseId?: string;
  receivedAmount?: number;
  /** Reste à payer calculé par le backend (dû − payé). */
  remainingToPay?: number;
  expectedDeliveryDate?: string | null;
  closedAt?: string | null;
  closeReason?: string | null;
}
