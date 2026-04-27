export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type SaleType = 'RETAIL' | 'WHOLESALE';

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
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
}
