export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type SaleType = 'RETAIL' | 'WHOLESALE';
/** Statuts du backend (enum SaleStatus). */
export type SaleStatus = 'COMPLETED' | 'CANCELLED';

export interface SaleItem {
  productId: string;
  quantity: number;
  /** Prix unitaire appliqué par le backend. */
  unitPrice: number;
  purchasePrice?: number;
  // Champs du backend.
  productSku?: string;
  productName?: string;
  discountPercent?: number;
  lineTotal?: number;
}

export interface Sale {
  id: string;
  type: SaleType;
  customerId?: string;
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  paidAmount: number;
  total: number;
  profit: number;
  createdAt: string;
  createdByUserId: string;
  // Champs du backend.
  number?: string;
  status?: SaleStatus;
  warehouseId?: string;
  customerName?: string | null;
  note?: string | null;
  /** Annulation : date et motif (vente toujours visible, marquée annulée). */
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  subtotal?: number;
  discountTotal?: number;
  /** Part vendue à crédit (dette du client), calculée par le backend. */
  creditAmount?: number;
  /** Espèces remises par le client (vente en espèces, si saisi à la caisse). */
  cashReceived?: number | null;
  /** Monnaie rendue = montant reçu − montant payé (calculée par le serveur). */
  changeGiven?: number | null;
}
