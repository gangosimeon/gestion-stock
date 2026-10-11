export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type SaleType = 'RETAIL' | 'WHOLESALE';

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
  status?: 'CONFIRMED' | 'CANCELLED';
  customerName?: string | null;
  subtotal?: number;
  discountTotal?: number;
  /** Part vendue à crédit (dette du client), calculée par le backend. */
  creditAmount?: number;
}
