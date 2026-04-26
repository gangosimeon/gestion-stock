import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { PaymentMethod, Sale, SaleItem, SaleType } from '../../../core/models/sale.model';

export interface CartRow {
  productId: string;
  sku: string;
  name: string;
  stockQuantity: number;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  lineTotal: number;
  lineProfit: number;
}

export interface SalesFormState {
  type: SaleType;
  customerId: string | null;
  paymentMethod: PaymentMethod;
  paidAmount: number;
}

export interface SalesTotals {
  total: number;
  profit: number;
  itemsCount: number;
}

export interface SalesVm {
  isLoading: boolean;
  errorMessage: string | null;
  products: Product[];
  customers: Customer[];
  cart: CartRow[];
  form: SalesFormState;
  totals: SalesTotals;
  lastSale: Sale | null;
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement'
};

export const saleTypeLabels: Record<SaleType, string> = {
  RETAIL: 'Détail',
  WHOLESALE: 'Gros'
};

export function toSaleItems(cart: CartRow[]): SaleItem[] {
  return cart.map((r) => ({
    productId: r.productId,
    quantity: r.quantity,
    unitPrice: r.unitPrice,
    purchasePrice: r.purchasePrice
  }));
}
